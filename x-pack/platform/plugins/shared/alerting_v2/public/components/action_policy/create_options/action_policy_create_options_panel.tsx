/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiImage } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { CreateOptionItem } from '../../create_options';
import { CreateOptionsPanel } from '../../create_options';
import type { AgentBuilderSkillsRequirements } from '../../../hooks/use_are_agent_builder_skills_available';
import actionPolicyEmptyIllustration from '../../../assets/centralized_action_policies.svg';

export type ActionPolicyCreateOption = CreateOptionItem;

const CREATE_WITH_AGENT_MISSING_PRIVILEGE_TOOLTIP = i18n.translate(
  'xpack.alertingV2.actionPolicyCreateOptions.createWithAgentMissingPrivilegeTooltip',
  {
    defaultMessage:
      'To create action policies with the AI Agent, you need the "Agent Builder: Read" privilege.',
  }
);

/**
 * Builds the tooltip shown on the disabled "Create with agent" entry point. Returns `undefined`
 * when the skill is available (the option should then be enabled).
 */
export const getCreateActionPolicyWithAgentTooltipText = ({
  hasAgentBuilderCapability,
}: AgentBuilderSkillsRequirements): string | undefined =>
  hasAgentBuilderCapability ? undefined : CREATE_WITH_AGENT_MISSING_PRIVILEGE_TOOLTIP;

interface ActionPolicyCreateOptionsPanelProps {
  options: ActionPolicyCreateOption[];
}

/** Action policies list empty state — delegates to generic CreateOptionsPanel. */
export const ActionPolicyCreateOptionsPanel: React.FC<ActionPolicyCreateOptionsPanelProps> = ({
  options,
}) => (
  <CreateOptionsPanel
    title={
      <h2>
        <FormattedMessage
          id="xpack.alertingV2.actionPolicyCreateOptionsPanel.emptyStateTitle"
          defaultMessage="No action policies yet. Let's get started!"
        />
      </h2>
    }
    icon={
      <EuiImage
        size="fullWidth"
        src={actionPolicyEmptyIllustration}
        alt=""
        data-test-subj="actionPoliciesListEmptyIllustration"
      />
    }
    items={options}
    data-test-subj="actionPolicyCreateOptionsPanel"
  />
);
