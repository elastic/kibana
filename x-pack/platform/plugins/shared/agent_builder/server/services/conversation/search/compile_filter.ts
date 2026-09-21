/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { KueryNode } from '@kbn/es-query';
import { fromKueryExpression, nodeTypes, toElasticsearchQuery } from '@kbn/es-query';
import {
  createBadRequestError,
  CONVERSATION_SEARCH_FILTER_FIELDS,
  CONVERSATION_SEARCH_FILTER_MAX_LENGTH,
  CONVERSATION_SEARCH_FILTER_MAX_NODES,
  CONVERSATION_SEARCH_METADATA_FIELD_PREFIX,
} from '@kbn/agent-builder-common';
import { buildFilterDataView, resolveFilterField } from './field_registry';

const ALLOWED_FIELDS_MESSAGE = `Allowed fields: ${CONVERSATION_SEARCH_FILTER_FIELDS.join(
  ', '
)}, ${CONVERSATION_SEARCH_METADATA_FIELD_PREFIX}.<key>`;

// `ignore_unmapped` so a conversation index whose mapping predates the `events` nested field is
// treated as having no matching events instead of failing the whole search.
const QUERY_OPTIONS = { nestedIgnoreUnmapped: true } as const;

interface RewriteContext {
  metadataPaths: Set<string>;
  visited: number;
}

interface KqlStringLiteralNode extends KueryNode {
  type: 'literal';
  value: string;
}

const isStringLiteralNode = (node: KueryNode | undefined): node is KqlStringLiteralNode =>
  node?.type === 'literal' && typeof node.value === 'string';

const isFieldlessNode = (node: KueryNode | undefined): boolean =>
  node === undefined || (node.type === 'literal' && node.value === null);

const rewriteFieldClause = (node: KueryNode, context: RewriteContext): KueryNode => {
  const clauseArguments: KueryNode[] = Array.isArray(node.arguments) ? node.arguments : [];
  const [fieldArg, ...restArgs] = clauseArguments;

  if (isFieldlessNode(fieldArg)) {
    throw createBadRequestError(
      `Filter must be made of "field: value" comparisons; a bare value matches no field. ${ALLOWED_FIELDS_MESSAGE}`
    );
  }

  if (!isStringLiteralNode(fieldArg)) {
    throw createBadRequestError(
      `Filter field names must be written out in full; wildcards are not supported. ${ALLOWED_FIELDS_MESSAGE}`
    );
  }

  const apiFieldName = fieldArg.value;
  const resolved = resolveFilterField(apiFieldName);

  if (!resolved) {
    throw createBadRequestError(
      `Invalid filter field "${apiFieldName}". ${ALLOWED_FIELDS_MESSAGE}`
    );
  }

  const isMetadataPath = resolved.path.startsWith(`${CONVERSATION_SEARCH_METADATA_FIELD_PREFIX}.`);

  if (node.function === 'range' && !resolved.rangeSupported) {
    throw createBadRequestError(
      isMetadataPath
        ? `Filter field "${apiFieldName}" does not support range comparisons. Metadata is stored untyped, so a range would compare values as strings and order numbers wrongly.`
        : `Filter field "${apiFieldName}" does not support range comparisons; it is not a date field.`
    );
  }

  if (isMetadataPath) {
    context.metadataPaths.add(resolved.path);
  }

  const rewritten: KueryNode = {
    ...node,
    arguments: [{ ...fieldArg, value: resolved.astPath }, ...restArgs],
  };

  if (!resolved.nestedPath) {
    return rewritten;
  }

  return nodeTypes.function.buildNode('nested', resolved.nestedPath, rewritten);
};

const getOperands = (node: KueryNode): KueryNode[] => {
  const operands = node.arguments;

  if (!Array.isArray(operands) || operands.length === 0) {
    throw createBadRequestError(
      `Malformed "${String(node.function)}" expression in filter: it has no operands.`
    );
  }

  return operands;
};

const rewriteNode = (node: KueryNode, context: RewriteContext): KueryNode => {
  context.visited += 1;
  if (context.visited > CONVERSATION_SEARCH_FILTER_MAX_NODES) {
    throw createBadRequestError(
      `Filter is too complex: it may not contain more than ${CONVERSATION_SEARCH_FILTER_MAX_NODES} expressions.`
    );
  }

  if (!node || node.type !== 'function') {
    throw createBadRequestError(
      `Unsupported expression in filter: expected a comparison or a boolean combination of them. ${ALLOWED_FIELDS_MESSAGE}`
    );
  }

  switch (node.function) {
    case 'and':
    case 'or':
      return {
        ...node,
        arguments: getOperands(node).map((child) => rewriteNode(child, context)),
      };

    case 'not':
      return {
        ...node,
        arguments: [rewriteNode(getOperands(node)[0], context)],
      };

    case 'is':
    case 'range':
      return rewriteFieldClause(node, context);

    // `nested` groups and `exists` reference storage paths directly which callers can't use.
    case 'nested':
    case 'exists':
    default:
      throw createBadRequestError(
        `Unsupported expression "${String(node.function)}" in filter. ${ALLOWED_FIELDS_MESSAGE}`
      );
  }
};

const parseFilterExpression = (filter: string): KueryNode => {
  if (filter.length > CONVERSATION_SEARCH_FILTER_MAX_LENGTH) {
    throw createBadRequestError(
      `Filter exceeds maximum length of ${CONVERSATION_SEARCH_FILTER_MAX_LENGTH} characters.`
    );
  }

  try {
    return fromKueryExpression(filter);
  } catch (error) {
    throw createBadRequestError(`Invalid filter: ${(error as Error).message}`);
  }
};

/**
 * Compiles a caller-supplied filter into Elasticsearch query DSL over the conversation index.
 *
 * @param filter - KQL expression such as `event_type: user_message AND NOT owner: "elastic"`, or an
 *   equivalent AST built with `nodeBuilder` from `@kbn/es-query`.
 * @returns The compiled query, or `undefined` when no filter was supplied.
 * @throws A bad request error when the filter exceeds its size bounds, fails to parse, or
 *   references an unknown field, an unsupported expression, or a range on a non-date field.
 */
export const compileConversationFilter = (
  filter: string | KueryNode | undefined
): QueryDslQueryContainer | undefined => {
  if (filter === undefined) {
    return undefined;
  }

  let parsed: KueryNode;
  if (typeof filter === 'string') {
    const trimmedFilter = filter.trim();
    if (!trimmedFilter) {
      return undefined;
    }
    parsed = parseFilterExpression(trimmedFilter);
  } else {
    parsed = filter;
  }

  const context: RewriteContext = { metadataPaths: new Set(), visited: 0 };
  const rewritten = rewriteNode(parsed, context);

  return toElasticsearchQuery(
    rewritten,
    buildFilterDataView([...context.metadataPaths]),
    QUERY_OPTIONS
  );
};
