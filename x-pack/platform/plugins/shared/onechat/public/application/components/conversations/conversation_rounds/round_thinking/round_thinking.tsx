/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiAccordion, EuiFlexGroup, EuiFlexItem, EuiPanel } from '@elastic/eui';
import type { ConversationRoundStep } from '@kbn/onechat-common';
import { isToolCallStep } from '@kbn/onechat-common';
import type { ReactNode } from 'react';
import React from 'react';
// import type {
//   QueryResult,
//   ResourceResult,
//   TabularDataResult,
// } from '@kbn/onechat-common/tools/tool_result';
import { ToolResultType } from '@kbn/onechat-common/tools/tool_result';
import { RoundSteps } from './steps/round_steps';

interface RoundThinkingProps {
  steps: ConversationRoundStep[];
  loadingIndicator: ReactNode;
}

// const DEMO_resourceResult: ResourceResult = {
//   type: ToolResultType.resource,
//   data: {
//     reference: {
//       id: 'MXTTqJgB5goA5uOmBYYt',
//       index: 'financial_news',
//     },
//     partial: false,
//     content: {
//       article_id: '09644512-12a9-4351-b33d-7b5147bc0fee',
//       title: 'DEMO RESOURCE: Exxon Mobil Confirms Cyber Breach, Assures Minimal Operational Impact',
//       content:
//         "Exxon Mobil Corp. (XOM) confirmed a cybersecurity incident affecting some of its operational support systems, sending mixed signals through the Energy sector. While the oil giant stated that core production and delivery systems remained unaffected, initial concerns over potential data compromise and operational delays briefly pressured its shares. The company swiftly initiated containment protocols, emphasizing that the breach was quickly identified and isolated.\n\nAnalysts suggest the incident highlights growing cyber vulnerabilities across critical infrastructure, even as Exxon Mobil's rapid response aims to mitigate long-term repercussions. This event comes at a time when the broader Energy sector is already facing heightened scrutiny regarding digital resilience, balancing the immediate threat with the ongoing robust demand for fossil fuels.",
//       source: 'Reuters',
//       published_date: '2025-06-02T14:48:07',
//       url: 'http://fakenews.com/article/1941911e',
//       entities: ['XOM', 'Exxon Mobil Corp.', 'Energy'],
//       sentiment: 'mixed',
//       last_updated: '2025-06-02T14:48:15',
//     },
//   },
// };

// const DEMO_tabularDataResult: TabularDataResult = {
//   type: ToolResultType.tabularData,
//   data: {
//     columns: [
//       { name: 'account_holder_name', type: 'text' },
//       { name: 'total_portfolio_value', type: 'double' },
//     ],
//     values: [
//       ['DEMO: Ronald Bonilla', 43796132.55],
//       ['DEMO: Roy Bishop', 43185063.13],
//       ['DEMO: Alexander Cabrera', 41642589.09],
//       ['DEMO: Nicholas Ryan', 41563759.82],
//       ['DEMO: Christopher Perry', 40343707.36],
//       ['DEMO: Eric Green', 40054855.82],
//       ['DEMO: Heidi Weber', 39969049.99],
//       ['DEMO: Donna Mendez', 39922531.74],
//       ['DEMO: Denise Brown', 39250061.89],
//       ['DEMO: Mariah Smith', 38886743.56],
//     ],
//   },
// };

// const DEMO_queryResult: QueryResult = {
//   type: ToolResultType.query,
//   data: {
//     esql: '// DEMO QUERY\nFROM financial_accounts\n| STATS total_portfolio_value = SUM(total_portfolio_value) BY account_holder_name, account_type\n| SORT total_portfolio_value DESC\n| KEEP account_holder_name, account_type, total_portfolio_value',
//   },
// };

export const RoundThinking: React.FC<RoundThinkingProps> = ({ steps, loadingIndicator }) => {
  const toolResults = steps
    .filter(isToolCallStep)
    .flatMap((step) => step.results)
    .filter((result) => {
      // TODO: Should we include other results?
      // Would just show as a JSON blob
      if (result.type === ToolResultType.other) {
        return true;
      }
      // Don't include partial resource results
      if (result.type === ToolResultType.resource && result.data.partial) {
        return false;
      }
      return true;
    });
  // .concat([DEMO_resourceResult, DEMO_tabularDataResult, DEMO_queryResult]);
  if (steps.length === 0) {
    return loadingIndicator ? <div>{loadingIndicator}</div> : null;
  }

  return (
    <EuiAccordion
      id="round-thinking"
      arrowDisplay="left"
      buttonContent={
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          {loadingIndicator && <EuiFlexItem grow={false}>{loadingIndicator}</EuiFlexItem>}
          {/* TODO: Add thinking label that describes what steps were taken */}
          {/* <EuiFlexItem grow={false}>Completed 1 search. Found 3 context docs.</EuiFlexItem> */}
        </EuiFlexGroup>
      }
    >
      <EuiPanel paddingSize="l" hasShadow={false} hasBorder={false} color="subdued">
        <RoundSteps toolResults={toolResults} />
      </EuiPanel>
    </EuiAccordion>
  );
};
