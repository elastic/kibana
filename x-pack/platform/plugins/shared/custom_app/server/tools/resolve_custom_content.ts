/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getESQLQueryVariables } from '@kbn/esql-utils';
import type { CustomContentTemplateResolver } from '@kbn/custom-content-server';
import {
  getNodeChildren,
  isContainerNode,
  type AppNode,
  type AppTheme,
  type StateDeclaration,
} from '@kbn/custom-app-common';

/** Each template is a call to a model, so one tool call can only ask for a few. */
export const MAX_TEMPLATES_PER_CALL = 4;

type CustomContentNode = Extract<AppNode, { type: 'custom_content' }>;
type Params = Array<Record<string, string | number | boolean>>;

const collectPrompted = (node: AppNode): CustomContentNode[] => [
  ...(node.type === 'custom_content' && node.prompt ? [node] : []),
  ...getNodeChildren(node).flatMap(collectPrompted),
];

/** The default of each value the query uses, so a query with parameters can be tried. */
const getSampleParams = (
  query: string | undefined,
  state: Readonly<Record<string, StateDeclaration>>
): Params =>
  Array.from(new Set(query ? getESQLQueryVariables(query) : [])).flatMap((name) => {
    if (!(name in state)) return [];
    const { default: value } = state[name];
    // A list is tried with its first value, or an empty one: it is a sample of the data that is
    // wanted, and a value stands for a list of one.
    return [{ [name]: Array.isArray(value) ? value[0] ?? '' : value }];
  });

const replaceNodes = (node: AppNode, replacements: ReadonlyMap<string, AppNode>): AppNode => {
  const replacement = replacements.get(node.id);
  if (replacement) return replacement;
  // Any component that holds others: a template may be inside tabs, a card or columns as well.
  if (isContainerNode(node)) {
    return {
      ...node,
      children: node.children.map((child) => replaceNodes(child, replacements)),
    } as AppNode;
  }
  return node;
};

/** What is resolved: the values and the components, and the rest of the document, such as its theme, as it is. */
interface ResolvableDocument {
  state: Record<string, StateDeclaration>;
  root: AppNode;
  theme?: AppTheme;
}

type Resolved = { document: ResolvableDocument } | { error: string };

/**
 * Turns the `prompt` of each custom content component into its template, and drops the prompt.
 * The model only says what it wants; the HTML is written by the same resolver a custom content
 * panel uses, which also gives it the real columns of the query to write against. A component
 * with no prompt keeps the template it came with.
 */
export const resolveCustomContent = async (
  document: ResolvableDocument,
  resolver: CustomContentTemplateResolver
): Promise<Resolved> => {
  const prompted = collectPrompted(document.root);
  if (prompted.length === 0) return { document };
  if (prompted.length > MAX_TEMPLATES_PER_CALL) {
    return {
      error: `Only ${MAX_TEMPLATES_PER_CALL} templates can be written in one call, and ${prompted.length} were asked for. Ask for ${MAX_TEMPLATES_PER_CALL} or fewer now and the rest in another call.`,
    };
  }

  const replacements = new Map<string, AppNode>();
  for (const node of prompted) {
    try {
      const esqlParams = getSampleParams(node.query, document.state);
      const { template, height } = await resolver({
        prompt: node.prompt as string,
        esqlQuery: node.query,
        existingTemplate: node.template?.trim() ? node.template : undefined,
        hasExistingQuery: false,
        ...(esqlParams.length > 0 ? { esqlParams } : {}),
      });
      const { prompt: _prompt, ...rest } = node;
      replacements.set(node.id, { ...rest, template, height });
    } catch (err) {
      return {
        error: `Could not write the template of "${node.id}": ${
          err instanceof Error ? err.message : String(err)
        }`,
      };
    }
  }

  return { document: { ...document, root: replaceNodes(document.root, replacements) } };
};
