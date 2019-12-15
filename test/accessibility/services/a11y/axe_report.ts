/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
    Help: ${result.helpUrl}
    Elements:
      - ${result.nodes.map(node => node.target).join('\n      - ')}`;
