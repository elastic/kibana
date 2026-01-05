/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiTourStep } from '@elastic/eui';
import React from 'react';
import { TourStep, useAgentBuilderTour } from '../../../../context/agent_builder_tour_context';
import { AgentSelector } from './agent_selector';
import { ConversationActionButton } from './conversation_action_button';
import { ConnectorSelector } from './connector_selector';

interface InputActionsProps {
  onSubmit: () => void;
  isSubmitDisabled: boolean;
  resetToPendingMessage: () => void;
  agentId?: string;
}

export const InputActions: React.FC<InputActionsProps> = ({
  onSubmit,
  isSubmitDisabled,
  resetToPendingMessage,
  agentId,
}) => {
  const { getStepProps } = useAgentBuilderTour();

  return (
    <EuiFlexItem grow={false}>
      <EuiFlexGroup
        gutterSize="s"
        responsive={false}
        alignItems="center"
        justifyContent="spaceBetween"
      >
        <EuiFlexItem grow={false}>
          <EuiTourStep {...getStepProps(TourStep.LlmSelector)}>
            <ConnectorSelector />
          </EuiTourStep>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="m" responsive={false} alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiTourStep {...getStepProps(TourStep.AgentSelector)}>
                <AgentSelector agentId={agentId} />
              </EuiTourStep>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <ConversationActionButton
                onSubmit={onSubmit}
                isSubmitDisabled={isSubmitDisabled}
                resetToPendingMessage={resetToPendingMessage}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexItem>
  );
};
