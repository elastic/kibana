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
import { ToolResultType } from '@kbn/onechat-common/tools/tool_result';
import { RoundSteps } from './steps/round_steps';

interface RoundThinkingProps {
  steps: ConversationRoundStep[];
  loadingIndicator: ReactNode;
}

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
