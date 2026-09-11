/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { KueryNode } from '@kbn/es-query';
import { fromKueryExpression, nodeTypes, toElasticsearchQuery } from '@kbn/es-query';
import { createBadRequestError } from '@kbn/agent-builder-common';
import {
  CONVERSATION_SEARCH_FILTER_FIELDS,
  CONVERSATION_SEARCH_METADATA_FIELD_PREFIX,
} from '@kbn/agent-builder-common';
import {
  CONVERSATION_SEARCH_FILTER_MAX_LENGTH,
  CONVERSATION_SEARCH_FILTER_MAX_NODES,
} from '../../../../common/constants';
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

const rewriteFieldClause = (node: KueryNode, context: RewriteContext): KueryNode => {
  const clauseArguments: KueryNode[] = Array.isArray(node.arguments) ? node.arguments : [];
  const [fieldArg, ...restArgs] = clauseArguments;

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

  if (node.function === 'range' && !resolved.rangeSupported) {
    throw createBadRequestError(
      `Filter field "${apiFieldName}" does not support range comparisons; it is not a date field.`
    );
  }

  if (resolved.path.startsWith(`${CONVERSATION_SEARCH_METADATA_FIELD_PREFIX}.`)) {
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

const rewriteNode = (node: KueryNode, context: RewriteContext): KueryNode => {
  context.visited += 1;
  if (context.visited > CONVERSATION_SEARCH_FILTER_MAX_NODES) {
    throw createBadRequestError(
      `Filter is too complex: it may not contain more than ${CONVERSATION_SEARCH_FILTER_MAX_NODES} expressions.`
    );
  }

  if (node.type !== 'function') {
    throw createBadRequestError(
      `Unsupported expression in filter: expected a comparison or a boolean combination of them. ${ALLOWED_FIELDS_MESSAGE}`
    );
  }

  switch (node.function) {
    case 'and':
    case 'or':
      return {
        ...node,
        arguments: (node.arguments as KueryNode[]).map((child) => rewriteNode(child, context)),
      };

    case 'not':
      return {
        ...node,
        arguments: [rewriteNode((node.arguments as KueryNode[])[0], context)],
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
