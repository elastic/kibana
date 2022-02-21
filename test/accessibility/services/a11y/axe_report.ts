/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

type AxeImpact = 'minor' | 'moderate' | 'serious' | 'critical';

type AxeRelatedNodes = Array<{
  data: any;
  id: string;
  impact: AxeImpact;
  message: string;
  relatedNodes: [];
}>;

export interface AxeResult {
  /* Rule description */
  description: string;
  /* rule title/error message */
  help: string;
  /* documentation url */
  helpUrl: string;
  /* rule id */
  id: string;
  /* severity level */
  impact?: AxeImpact;
  /* tags used to group rules */
  tags: string[];
  /* nodes grouped in this result */
  nodes: Array<{
    all: AxeRelatedNodes;
    any: AxeRelatedNodes;
    none: AxeRelatedNodes;

    html: string;
    impact: AxeImpact;
    target: string[];
  }>;
}

export type AxeResultGroup = AxeResult[];

export interface AxeReport {
  inapplicable: AxeResultGroup;
  passes: AxeResultGroup;
  incomplete: AxeResultGroup;
  violations: AxeResultGroup;
}

export const printResult = (title: string, result: AxeResult) => `
${title}
  [${result.id}]: ${result.description}
    Impact: ${result.impact}
    Help: ${result.helpUrl}
    Elements:
      - ${result.nodes.map((node) => node.html).join('\n      - ')}`;
