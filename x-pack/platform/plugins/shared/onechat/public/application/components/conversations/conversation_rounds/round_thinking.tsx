/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiAccordion, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { ConversationRoundStep } from '@kbn/onechat-common';
import type { ReactNode } from 'react';
import React from 'react';
import { RoundSteps } from './round_steps';

interface RoundThinkingProps {
  steps: ConversationRoundStep[];
  loadingIndicator: ReactNode;
}

export const RoundThinking: React.FC<RoundThinkingProps> = ({ steps, loadingIndicator }) => {
  if (steps.length === 0) {
    return loadingIndicator ? <div>{loadingIndicator}</div> : null;
  }
  return (
    <EuiAccordion
      id="round-thinking"
      arrowDisplay="right"
      buttonContent={
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          {loadingIndicator && <EuiFlexItem grow={false}>{loadingIndicator}</EuiFlexItem>}
          {/* TODO: Add thinking label that describes what steps were taken */}
          {/* <EuiFlexItem grow={false}>Completed 1 search. Found 3 context docs.</EuiFlexItem> */}
        </EuiFlexGroup>
      }
    >
      <RoundSteps steps={steps} />
    </EuiAccordion>
  );
};
