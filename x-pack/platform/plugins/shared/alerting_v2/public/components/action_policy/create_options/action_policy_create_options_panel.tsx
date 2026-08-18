/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiImage,
  EuiPageTemplate,
  EuiPanel,
  EuiText,
  EuiToolTip,
  euiMinBreakpoint,
  type UseEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { AgentBuilderSkillsRequirements } from '../../../hooks/use_are_agent_builder_skills_available';
import rulesListEmptyIllustration from '../../../assets/illustration-results-128.svg';

export interface ActionPolicyCreateOption {
  id: string;
  iconType: string;
  title: string;
  description: string;
  onClick: () => void;
  /** When `true`, the option is rendered disabled and its click is a no-op. */
  disabled?: boolean;
  /** When set, this string is shown as a hover/focus tooltip, independent of `disabled`. */
  tooltipText?: string;
  'data-test-subj'?: string;
}

interface ActionPolicyCreateOptionsPanelProps {
  options: ActionPolicyCreateOption[];
}

/** Fits the option descriptions on one line. */
const LIST_EMPTY_STATE_MAX_INLINE_SIZE = '44em';

const listEmptyStateStyles = {
  parent: css({
    display: 'flex',
    flexGrow: 1,
    height: '100%',
    width: '100%',
  }),
  template: css({
    backgroundColor: 'inherit',
    marginInline: 'auto',
    maxInlineSize: LIST_EMPTY_STATE_MAX_INLINE_SIZE,
    width: '100%',
  }),
  widgetContainer: (euiThemeContext: UseEuiTheme) => {
    const { euiTheme } = euiThemeContext;
    return css({
      padding: euiTheme.size.xl,
      borderRadius: euiTheme.border.radius.medium,
      width: '100%',
      maxInlineSize: LIST_EMPTY_STATE_MAX_INLINE_SIZE,
      boxSizing: 'border-box',
      [euiMinBreakpoint(euiThemeContext, 'm')]: {
        width: LIST_EMPTY_STATE_MAX_INLINE_SIZE,
      },
      '.euiEmptyPrompt__icon': {
        marginBottom: euiTheme.size.l,
        paddingRight: euiTheme.size.s,
      },
      '.euiEmptyPrompt__content, .euiEmptyPrompt__actions': {
        maxInlineSize: '100%',
        width: '100%',
      },
    });
  },
  actionsWrapper: css({
    width: '100%',
    maxInlineSize: '100%',
    marginInline: 'auto',
  }),
  actionPanel: ({ euiTheme }: UseEuiTheme) =>
    css({
      padding: `${euiTheme.size.m} ${euiTheme.size.l}`,
      cursor: 'pointer',
      minWidth: 0,
      width: '100%',
      display: 'block',
    }),
  actionPanelTextWrapper: css({ minWidth: 0 }),
};

/** Applied to an action panel rendered in a disabled state (e.g. missing privileges). */
const actionPanelDisabledStyle = css({
  cursor: 'not-allowed',
  opacity: 0.5,
});

const CREATE_WITH_AGENT_MISSING_PRIVILEGE_TOOLTIP = i18n.translate(
  'xpack.alertingV2.actionPolicyCreateOptions.createWithAgentMissingPrivilegeTooltip',
  {
    defaultMessage:
      'To create action policies with the AI Agent, you need the "Agent Builder: Read" privilege.',
  }
);
const CREATE_WITH_AGENT_MISSING_SETTING_TOOLTIP = i18n.translate(
  'xpack.alertingV2.actionPolicyCreateOptions.createWithAgentMissingSettingTooltip',
  {
    defaultMessage:
      'To create action policies with the AI Agent, enable the "Elastic Agent Builder: Experimental Features" advanced setting.',
  }
);
const CREATE_WITH_AGENT_MISSING_ALL_TOOLTIP = i18n.translate(
  'xpack.alertingV2.actionPolicyCreateOptions.createWithAgentMissingAllTooltip',
  {
    defaultMessage:
      'To create action policies with the AI Agent, you need the "Agent Builder: Read" privilege and the "Elastic Agent Builder: Experimental Features" advanced setting enabled.',
  }
);

/**
 * Builds the tooltip shown on the disabled "Create with agent" entry point, naming the specific
 * prerequisite(s) the user is missing. Returns `undefined` when the skill is fully available (the
 * option should then be enabled).
 */
export const getCreateActionPolicyWithAgentTooltipText = ({
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

const noop = () => undefined;

const CreateOptionActionPanel: React.FC<{
  item: ActionPolicyCreateOption;
  actionPanelStyle: React.ComponentProps<typeof EuiPanel>['css'];
}> = ({ item, actionPanelStyle }) => {
  const isDisabled = item.disabled === true;
  const hasTooltip = item.tooltipText !== undefined;
  const panel = (
    <EuiPanel
      element="button"
      hasBorder
      paddingSize="none"
      // EuiPanel has no built-in disabled appearance (unlike EuiCard's `isDisabled`), and a native
      // `disabled` button would both leave it unstyled and suppress the hover events EuiToolTip
      // needs. So we convey the disabled state with `aria-disabled` + styling and guard the click.
      aria-disabled={isDisabled || undefined}
      onClick={isDisabled ? noop : item.onClick}
      css={[actionPanelStyle, isDisabled && actionPanelDisabledStyle]}
      data-test-subj={item['data-test-subj']}
    >
      <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiIcon type={item.iconType} size="l" color="text" aria-hidden={true} />
        </EuiFlexItem>
        <EuiFlexItem css={listEmptyStateStyles.actionPanelTextWrapper}>
          <EuiText size="s">
            <strong>{item.title}</strong>
          </EuiText>
          <EuiText size="xs" color="subdued">
            {item.description}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );

  if (hasTooltip) {
    return (
      <EuiToolTip content={item.tooltipText} display="block">
        {panel}
      </EuiToolTip>
    );
  }

  return panel;
};

/** Action policies list empty state — matches the rules list create empty prompt layout. */
export const ActionPolicyCreateOptionsPanel: React.FC<ActionPolicyCreateOptionsPanelProps> = ({
  options,
}) => {
  const styles = useMemoCss(listEmptyStateStyles);

  return (
    <div css={styles.parent} data-test-subj="actionPolicyCreateOptionsPanel">
      <EuiPageTemplate grow={false} offset={0} css={styles.template}>
        <EuiPageTemplate.EmptyPrompt
          paddingSize="none"
          icon={
            <EuiImage
              size="fullWidth"
              src={rulesListEmptyIllustration}
              alt=""
              data-test-subj="actionPoliciesListEmptyIllustration"
            />
          }
          title={
            <h2>
              <FormattedMessage
                id="xpack.alertingV2.actionPolicyCreateOptionsPanel.emptyStateTitle"
                defaultMessage="No action policies yet. Let's get started!"
              />
            </h2>
          }
          actions={
            <EuiFlexGroup direction="column" gutterSize="s" css={styles.actionsWrapper}>
              {options.map((item) => (
                <EuiFlexItem key={item.id} grow={false}>
                  <CreateOptionActionPanel item={item} actionPanelStyle={styles.actionPanel} />
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
          }
          titleSize="xs"
          color="transparent"
          css={styles.widgetContainer}
        />
      </EuiPageTemplate>
    </div>
  );
};
