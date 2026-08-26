/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiCard,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiImage,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { CreateOptionItem } from '../create_options';
import { CreateOptionsPanel } from '../create_options';
import type { AgentBuilderSkillsRequirements } from '../../hooks/use_are_agent_builder_skills_available';
import rulesListEmptyIllustration from '../../assets/illustration-results-128.svg';

export interface LegacyRuleTypeItem {
  id: string;
  label: string;
  onClick: () => void;
  'data-test-subj'?: string;
}

interface RuleCreateOptionsPanelProps {
  onCreateEsqlRule: () => void;
  layout?: 'vertical' | 'horizontal';
  onCreateWithAgent: () => void;
  /**
   * When `true`, the "Create with AI Agent" option is rendered disabled (click is a no-op). Independent
   * of `createWithAgentTooltipText` — a disabled option need not have a tooltip, and a tooltip can be
   * shown without disabling.
   */
  createWithAgentDisabled?: boolean;
  /**
   * Optional tooltip text for the "Create with AI Agent" option (e.g. explaining a missing
   * prerequisite). Shown on hover/focus regardless of whether the option is disabled.
   */
  createWithAgentTooltipText?: string;
  onCreateThresholdRule?: () => void;
  legacyRuleTypes?: LegacyRuleTypeItem[];
}

const ESQL_RULE_TITLE = i18n.translate(
  'xpack.alertingV2.ruleCreateOptionsPanel.createEsqlRuleTitle',
  { defaultMessage: 'Create ES|QL rule' }
);
const ESQL_RULE_DESCRIPTION = i18n.translate(
  'xpack.alertingV2.ruleCreateOptionsPanel.createWithEsqlDescription',
  { defaultMessage: 'Create as an ES|QL query with live preview. YAML editor available.' }
);
const AI_AGENT_TITLE = i18n.translate(
  'xpack.alertingV2.ruleCreateOptionsPanel.createWithAiAgentTitle',
  { defaultMessage: 'Create with AI Agent' }
);
const AI_AGENT_DESCRIPTION = i18n.translate(
  'xpack.alertingV2.ruleCreateOptionsPanel.createWithAiAgentDescription',
  { defaultMessage: 'Set up an Alerting rule with the help of the AI Agent.' }
);
const CREATE_WITH_AGENT_MISSING_PRIVILEGE_TOOLTIP = i18n.translate(
  'xpack.alertingV2.ruleCreateOptions.createWithAgentMissingPrivilegeTooltip',
  {
    defaultMessage:
      'To create rules with the AI Agent, you need the "Agent Builder: Read" privilege.',
  }
);
const CREATE_WITH_AGENT_MISSING_SETTING_TOOLTIP = i18n.translate(
  'xpack.alertingV2.ruleCreateOptions.createWithAgentMissingSettingTooltip',
  {
    defaultMessage:
      'To create rules with the AI Agent, enable the "Elastic Agent Builder: Experimental Features" advanced setting.',
  }
);
const CREATE_WITH_AGENT_MISSING_ALL_TOOLTIP = i18n.translate(
  'xpack.alertingV2.ruleCreateOptions.createWithAgentMissingAllTooltip',
  {
    defaultMessage:
      'To create rules with the AI Agent, you need the "Agent Builder: Read" privilege and the "Elastic Agent Builder: Experimental Features" advanced setting enabled.',
  }
);

/**
 * Builds the tooltip shown on the disabled "Create with agent" entry points, naming the specific
 * prerequisite(s) the user is missing. Returns `undefined` when the skill is fully available (the
 * option should then be enabled). Shared so all entry points produce the same message.
 */
export const getCreateWithAgentTooltipText = ({
  hasAgentBuilderCapability,
  isExperimentalFeaturesEnabled,
}: AgentBuilderSkillsRequirements): string | undefined => {
  if (hasAgentBuilderCapability && isExperimentalFeaturesEnabled) {
    return undefined;
  }
  if (!hasAgentBuilderCapability && !isExperimentalFeaturesEnabled) {
    return CREATE_WITH_AGENT_MISSING_ALL_TOOLTIP;
  }
  if (!hasAgentBuilderCapability) {
    return CREATE_WITH_AGENT_MISSING_PRIVILEGE_TOOLTIP;
  }
  return CREATE_WITH_AGENT_MISSING_SETTING_TOOLTIP;
};

const THRESHOLD_RULE_TITLE = i18n.translate(
  'xpack.alertingV2.ruleCreateOptionsPanel.thresholdRuleTitle',
  { defaultMessage: 'Threshold rule' }
);
const THRESHOLD_RULE_DESCRIPTION = i18n.translate(
  'xpack.alertingV2.ruleCreateOptionsPanel.thresholdRuleDescription',
  {
    defaultMessage: 'Monitor metrics against one or more threshold conditions.',
  }
);

const noop = () => undefined;

/** Applied to the EuiCard in the flyout layout when the option is disabled. */
const flyoutCardDisabledStyle = css({
  cursor: 'not-allowed',
  opacity: 0.5,
});

/** Rules list empty state — delegates to generic CreateOptionsPanel. */
const RuleCreateOptionsListEmptyState: React.FC<RuleCreateOptionsPanelProps> = ({
  onCreateEsqlRule,
  onCreateWithAgent,
  createWithAgentDisabled,
  createWithAgentTooltipText,
  onCreateThresholdRule,
}) => {
  const primaryItems = useMemo<CreateOptionItem[]>(
    () => [
      {
        id: 'create-esql-rule',
        iconType: 'productDiscover',
        title: ESQL_RULE_TITLE,
        description: ESQL_RULE_DESCRIPTION,
        onClick: onCreateEsqlRule,
        'data-test-subj': 'createEsqlRuleCard',
      },
      {
        id: 'create-with-agent',
        iconType: 'productAgent',
        title: AI_AGENT_TITLE,
        description: AI_AGENT_DESCRIPTION,
        onClick: onCreateWithAgent,
        disabled: createWithAgentDisabled,
        tooltipText: createWithAgentTooltipText,
        'data-test-subj': 'createWithAgentCard',
      },
    ],
    [onCreateEsqlRule, onCreateWithAgent, createWithAgentDisabled, createWithAgentTooltipText]
  );

  const secondaryItems = useMemo<CreateOptionItem[]>(
    () => [
      {
        id: 'create-threshold-rule',
        iconType: 'chartThreshold',
        title: THRESHOLD_RULE_TITLE,
        description: THRESHOLD_RULE_DESCRIPTION,
        onClick: onCreateThresholdRule ?? noop,
        'data-test-subj': 'createThresholdRuleCard',
      },
    ],
    [onCreateThresholdRule]
  );

  return (
    <CreateOptionsPanel
      title={
        <h2>
          <FormattedMessage
            id="xpack.alertingV2.ruleCreateOptionsPanel.emptyStateTitle"
            defaultMessage="No rules yet. Let's get started!"
          />
        </h2>
      }
      icon={
        <EuiImage
          size="fullWidth"
          src={rulesListEmptyIllustration}
          alt=""
          data-test-subj="rulesListEmptyIllustration"
        />
      }
      items={primaryItems}
      secondaryItems={secondaryItems}
      secondaryLabel={
        <FormattedMessage
          id="xpack.alertingV2.ruleCreateOptionsPanel.orStartFromBuilderLabel"
          defaultMessage="or start from a builder"
        />
      }
      data-test-subj="ruleCreateOptionsPanel"
    />
  );
};

const RuleBuilderSectionDivider: React.FC = () => (
  <>
    <EuiSpacer size="s" />
    <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
      <EuiFlexItem>
        <EuiHorizontalRule margin="none" />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText size="s" color="subdued">
          <FormattedMessage
            id="xpack.alertingV2.ruleCreateOptionsPanel.orStartFromBuilderLabel"
            defaultMessage="or start from a builder"
          />
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiHorizontalRule margin="none" />
      </EuiFlexItem>
    </EuiFlexGroup>
    <EuiSpacer size="l" />
  </>
);

const LegacyRuleTypesSection: React.FC<{ items: LegacyRuleTypeItem[] }> = ({ items }) => {
  if (items.length === 0) return null;

  return (
    <>
      <EuiSpacer size="l" />
      <EuiTitle size="xs">
        <h3>
          <FormattedMessage
            id="xpack.alertingV2.ruleCreateOptionsPanel.legacyRuleTypesTitle"
            defaultMessage="Classic rule types"
          />
        </h3>
      </EuiTitle>
      <EuiSpacer size="m" />
      <EuiFlexGroup direction="column" gutterSize="s">
        {items.map((item) => (
          <EuiFlexItem key={item.id} grow={false}>
            <EuiPanel
              element="button"
              hasBorder={false}
              hasShadow={false}
              color="transparent"
              paddingSize="xs"
              onClick={item.onClick}
              data-test-subj={item['data-test-subj']}
            >
              <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiIcon type="bell" size="m" color="subdued" aria-hidden={true} />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText size="s">{item.label}</EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiPanel>
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    </>
  );
};

/** Create-rule flyout — original card layout. */
const RuleCreateOptionsFlyoutPanel: React.FC<RuleCreateOptionsPanelProps> = ({
  onCreateEsqlRule,
  onCreateWithAgent,
  createWithAgentDisabled,
  createWithAgentTooltipText,
  onCreateThresholdRule,
  legacyRuleTypes,
}) => {
  const isAgentDisabled = createWithAgentDisabled === true;
  const hasAgentTooltip = createWithAgentTooltipText !== undefined;
  const agentCard = (
    <EuiCard
      layout="horizontal"
      display="plain"
      titleElement="h3"
      titleSize="xs"
      hasBorder={true}
      aria-disabled={isAgentDisabled || undefined}
      css={isAgentDisabled ? flyoutCardDisabledStyle : undefined}
      title={AI_AGENT_TITLE}
      description={AI_AGENT_DESCRIPTION}
      onClick={isAgentDisabled ? noop : onCreateWithAgent}
      icon={<EuiIcon type="productAgent" color="text" size="l" aria-hidden={true} />}
      data-test-subj="createWithAgentCard"
    />
  );

  return (
    <>
      <EuiFlexGroup direction="column" gutterSize="l">
        <EuiFlexItem>
          <EuiCard
            layout="horizontal"
            display="plain"
            titleElement="h3"
            titleSize="xs"
            hasBorder={true}
            title={ESQL_RULE_TITLE}
            description={ESQL_RULE_DESCRIPTION}
            onClick={onCreateEsqlRule}
            icon={<EuiIcon type="productDiscover" color="text" size="l" aria-hidden={true} />}
            data-test-subj="createEsqlRuleCard"
          />
        </EuiFlexItem>
        <EuiFlexItem>
          {hasAgentTooltip ? (
            <EuiToolTip content={createWithAgentTooltipText} display="block">
              {agentCard}
            </EuiToolTip>
          ) : (
            agentCard
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
      <RuleBuilderSectionDivider />
      <EuiCard
        layout="horizontal"
        display="plain"
        titleElement="h3"
        titleSize="xs"
        hasBorder={true}
        title={THRESHOLD_RULE_TITLE}
        description={THRESHOLD_RULE_DESCRIPTION}
        onClick={onCreateThresholdRule ?? noop}
        icon={<EuiIcon type="chartThreshold" color="text" size="l" aria-hidden={true} />}
      />
      {legacyRuleTypes && <LegacyRuleTypesSection items={legacyRuleTypes} />}
    </>
  );
};

export const RuleCreateOptionsPanel: React.FC<RuleCreateOptionsPanelProps> = (props) => {
  const { layout = 'horizontal' } = props;
  const isVerticalLayout = layout === 'vertical';

  if (!isVerticalLayout) {
    return <RuleCreateOptionsListEmptyState {...props} />;
  }

  return <RuleCreateOptionsFlyoutPanel {...props} />;
};
