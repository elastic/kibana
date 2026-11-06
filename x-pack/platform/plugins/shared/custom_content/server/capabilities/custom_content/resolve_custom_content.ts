/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getESQLQueryVariables } from '@kbn/esql-utils';
import type { DocumentResolution, GenericNode, ResolvableDocument } from '@kbn/custom-app-registry';
import type { StateDeclaration } from '@kbn/custom-app-common';
import {
  CUSTOM_CONTENT_EMBEDDABLE_TYPE,
  CUSTOM_CONTENT_SCRIPT_PATTERN,
  readEsqlQuery,
} from '@kbn/custom-content-common';
import type { CustomContentTemplateResolver } from '@kbn/custom-content-server';

/** Each template is a call to a model, so one tool call can only ask for a few. */
export const MAX_TEMPLATES_PER_CALL = 4;

type Params = Array<Record<string, string | number | boolean>>;

interface State {
  esql_query?: string[];
  template?: string;
  prompt?: string;
  [key: string]: unknown;
}

/** An embeddable of custom content whose state asks for its template to be written. */
const isPrompted = (node: GenericNode): boolean =>
  node.type === 'embeddable' &&
  node.embeddableType === CUSTOM_CONTENT_EMBEDDABLE_TYPE &&
  typeof (node.state as State | undefined)?.prompt === 'string';

const collectPrompted = (node: GenericNode): GenericNode[] => [
  ...(isPrompted(node) ? [node] : []),
  ...(node.children ?? []).flatMap(collectPrompted),
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

const replaceNodes = (
  node: GenericNode,
  replacements: ReadonlyMap<string, GenericNode>
): GenericNode => {
  const replacement = replacements.get(node.id);
  if (replacement) return replacement;
  // Any component that holds others: a panel may be inside tabs, a card or columns as well.
  if (node.children) {
    return { ...node, children: node.children.map((child) => replaceNodes(child, replacements)) };
  }
  return node;
};

/**
 * Turns the `prompt` in the state of each custom content panel into its template, and drops the
 * prompt. The model only says what it wants; the HTML is written by the same resolver a custom
 * content panel uses, which also gives it the real columns of the query to write against. A panel
 * with no prompt keeps the template it came with.
 */
export const resolveCustomContent = async (
  document: ResolvableDocument,
  resolver: CustomContentTemplateResolver
): Promise<DocumentResolution<ResolvableDocument>> => {
  const prompted = collectPrompted(document.root);
  if (prompted.length === 0) return { document };
  if (prompted.length > MAX_TEMPLATES_PER_CALL) {
    return {
      error: `Only ${MAX_TEMPLATES_PER_CALL} templates can be written in one call, and ${prompted.length} were asked for. Ask for ${MAX_TEMPLATES_PER_CALL} or fewer now and the rest in another call.`,
    };
  }

  const replacements = new Map<string, GenericNode>();
  for (const node of prompted) {
    const { prompt, ...state } = node.state as State;
    try {
      const query = readEsqlQuery(state);
      const esqlParams = getSampleParams(query, document.state as Record<string, StateDeclaration>);
      const { template, height } = await resolver({
        prompt: prompt as string,
        esqlQuery: query,
        existingTemplate: state.template?.trim() ? state.template : undefined,
        hasExistingQuery: false,
        ...(esqlParams.length > 0 ? { esqlParams } : {}),
      });
      if (CUSTOM_CONTENT_SCRIPT_PATTERN.test(template)) {
        return {
          error: `The template of "${node.id}" has a script in it; it is shown with scripting off, so it must be plain HTML`,
        };
      }
      replacements.set(node.id, { ...node, height, state: { ...state, template } });
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
