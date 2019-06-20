/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SearchParams } from 'elasticsearch';
import { get } from 'lodash';
import { fromExpression } from '@kbn/interpreter/common';
import { AST, collectFns } from './collector_helpers';
import { TelemetryCollector } from './collector';

const CUSTOM_ELEMENT_TYPE = 'canvas-element';
interface CustomElementSearch {
  [CUSTOM_ELEMENT_TYPE]: CustomElementDocument;
}

export interface CustomElementDocument {
  content: string;
}

interface CustomElementTelemetry {
  custom_elements?: {
    count: number;
    elements: {
      min: number;
      max: number;
      avg: number;
    };
    functions_in_use: string[];
  };
}

export interface CustomElement {
  selectedNodes: Array<{
    expression: string;
  }>;
}

function isCustomElement(maybeCustomElement: any): maybeCustomElement is CustomElement {
  return (
    maybeCustomElement !== null &&
    Array.isArray(maybeCustomElement.selectedNodes) &&
    maybeCustomElement.selectedNodes.every(
      (node: any) => node.expression && typeof node.expression === 'string'
    )
  );
}

function parseJsonOrNull(maybeJson: string) {
  try {
    return JSON.parse(maybeJson);
  } catch (e) {
    return null;
  }
}

/**
  Calculate statistics about a collection of CustomElement Documents

  @param customElements - Array of CustomElement documents
  @returns Statistics about how Custom Elements are being used
*/
export function summarizeCustomElements(
  customElements: CustomElementDocument[]
): CustomElementTelemetry {
  const functionSet = new Set<string>();

  const parsedContents: CustomElement[] = customElements
    .map(element => element.content)
    .map(parseJsonOrNull)
    .filter(isCustomElement);

  if (parsedContents.length === 0) {
    return {};
  }

  const elements = {
    min: Infinity,
    max: -Infinity,
    avg: 0,
  };

  let totalElements = 0;

  parsedContents.map(contents => {
    contents.selectedNodes.map(node => {
      const ast: AST = fromExpression(node.expression) as AST; // TODO: Remove once fromExpression is properly typed
      collectFns(ast, (cFunction: string) => {
        functionSet.add(cFunction);
      });
    });
    elements.min = Math.min(elements.min, contents.selectedNodes.length);
    elements.max = Math.max(elements.max, contents.selectedNodes.length);
    totalElements += contents.selectedNodes.length;
  });

  elements.avg = totalElements / parsedContents.length;

  return {
    custom_elements: {
      elements,
      count: customElements.length,
      functions_in_use: Array.from(functionSet),
    },
  };
}

const customElementCollector: TelemetryCollector = async function customElementCollector(
  server,
  callCluster
) {
  const index = server.config().get<string>('kibana.index');

  const customElementParams: SearchParams = {
    size: 10000,
    index,
    ignoreUnavailable: true,
    filterPath: [`hits.hits._source.${CUSTOM_ELEMENT_TYPE}.content`],
    body: { query: { bool: { filter: { term: { type: CUSTOM_ELEMENT_TYPE } } } } },
  };

  const esResponse = await callCluster<CustomElementSearch>('search', customElementParams);

  if (get(esResponse, 'hits.hits.length') > 0) {
    const customElements = esResponse.hits.hits.map(hit => hit._source[CUSTOM_ELEMENT_TYPE]);
    return summarizeCustomElements(customElements);
  }

  return {};
};

export { customElementCollector };
