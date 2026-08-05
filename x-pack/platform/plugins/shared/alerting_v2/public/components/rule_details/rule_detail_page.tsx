/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiPanel,
  EuiSplitPanel,
  logicalCSS,
  useEuiMaxBreakpoint,
  useEuiMinBreakpoint,
  useEuiTheme,
} from '@elastic/eui';
import { AppHeader } from '@kbn/app-header';
import type { AppHeaderBadge, AppHeaderMenu, AppHeaderMetadataItems } from '@kbn/app-header';
import { RULE_KIND_LABELS } from '@kbn/alerting-v2-constants';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { css } from '@emotion/react';
import { useService } from '@kbn/core-di-browser';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useHistory } from 'react-router-dom';
import { UserCapabilities } from '../../services/user_capabilities';
import { useBreadcrumbs } from '../../hooks/use_breadcrumbs';
import { useRuleAuditMetadata } from '../../hooks/use_rule_audit_metadata';
import { useDeleteRule } from '../../hooks/use_delete_rule';
import { useComposeDiscoverFlyout } from '../../hooks/use_compose_discover_flyout';
import { useToggleRuleEnabled } from '../../hooks/use_toggle_rule_enabled';
import { paths } from '../../constants';
import { DeleteConfirmationModal } from '../rule/modals/delete_confirmation_modal';
import { RuleKindBadge } from './rule_summary_header';
import { RuleOverviewSection } from './overview';
import { RuleSidebar } from './sidebar/rule_sidebar';
import { useRule } from './rule_context';
import type { RuleApiResponse } from '../../services/rules_api';

const getRuleDetailBadges = (rule: RuleApiResponse): AppHeaderBadge[] => {
  const badges: AppHeaderBadge[] = [
    {
      label: RULE_KIND_LABELS[rule.kind] ?? rule.kind,
      renderCustomBadge: () => <RuleKindBadge kind={rule.kind} />,
    },
    {
      label: rule.enabled
        ? i18n.translate('xpack.alertingV2.ruleDetails.enabled', {
            defaultMessage: 'Enabled',
          })
        : i18n.translate('xpack.alertingV2.ruleDetails.disabled', {
            defaultMessage: 'Disabled',
          }),
      color: rule.enabled ? 'success' : 'default',
      'data-test-subj': rule.enabled ? 'enabledBadge' : 'disabledBadge',
    },
  ];

  for (const tag of rule.metadata.tags ?? []) {
    badges.push({ label: tag, color: 'hollow' });
  }

  return badges;
};

const getRuleDetailMenu = ({
  rule,
  onEdit,
  onToggleEnabled,
  isToggleLoading,
  onClone,
  onDelete,
}: {
  rule: RuleApiResponse;
  onEdit: () => void;
  onToggleEnabled: (enabled: boolean) => void;
  isToggleLoading: boolean;
  onClone: () => void;
  onDelete: () => void;
}): AppHeaderMenu => ({
  primaryActionItem: {
    id: 'editRule',
    label: i18n.translate('xpack.alertingV2.sections.ruleDetails.editRuleButtonLabel', {
      defaultMessage: 'Edit Rule',
    }),
    iconType: 'pencil',
    run: onEdit,
    testId: 'openEditRuleFlyoutButton',
  },
  switch: {
    id: 'ruleEnabled',
    label: rule.enabled
      ? i18n.translate('xpack.alertingV2.ruleDetails.enabled', {
          defaultMessage: 'Enabled',
        })
      : i18n.translate('xpack.alertingV2.ruleDetails.disabled', {
          defaultMessage: 'Disabled',
        }),
    labelProps: undefined,
    checked: rule.enabled,
    onChange: onToggleEnabled,
    disabled: isToggleLoading,
    'data-test-subj': 'ruleDetailsEnabledSwitch',
  },
  items: [
    {
      id: 'cloneRule',
      label: i18n.translate('xpack.alertingV2.ruleDetails.cloneRuleButtonLabel', {
        defaultMessage: 'Clone rule',
      }),
      iconType: 'copy',
      order: 0,
      run: onClone,
      testId: 'ruleDetailsCloneButton',
      overflow: true,
    },
    {
      id: 'deleteRule',
      label: i18n.translate('xpack.alertingV2.ruleDetails.deleteRuleButtonLabel', {
        defaultMessage: 'Delete rule',
      }),
      iconType: 'trash',
      order: 1,
      run: onDelete,
      testId: 'ruleDetailsDeleteButton',
      overflow: true,
    },
  ],
});

export const RuleDetailPage: React.FunctionComponent = () => {
  const rule = useRule();
  useBreadcrumbs('rule_details', { ruleName: rule.metadata?.name });
  const { euiTheme } = useEuiTheme();

  const canWrite = useService(UserCapabilities).canWrite('rules');

  const smallMediaQuery = useEuiMaxBreakpoint('s');
  const largeMediaQuery = useEuiMinBreakpoint('m');

  const history = useHistory();
  const { mutate: deleteRule, isLoading: isDeleting } = useDeleteRule();
  const { mutate: toggleRuleEnabled, isLoading: isToggling } = useToggleRuleEnabled();
  const { flyout, openEditFlyout, openCloneFlyout } = useComposeDiscoverFlyout();
  const [showDeleteConfirmation, setShowDeleteConfirmation] = React.useState(false);

  const showDeleteConfirmationModal = React.useCallback(() => {
    setShowDeleteConfirmation(true);
  }, []);

  const handleRuleDelete = () => {
    setShowDeleteConfirmation(false);
    deleteRule(
      { id: rule.id, name: rule.metadata.name },
      {
        onSuccess: () => {
          history.push('/');
        },
      }
    );
  };

  const handleToggleEnabled = React.useCallback(
    (enabled: boolean) => {
      toggleRuleEnabled({ id: rule.id, enabled });
    },
    [toggleRuleEnabled, rule.id]
  );

  const onEdit = React.useCallback(() => {
    openEditFlyout(rule);
  }, [openEditFlyout, rule]);

  const onClone = React.useCallback(() => {
    openCloneFlyout(rule);
  }, [openCloneFlyout, rule]);

  const { createdByDisplay, createdAtFormatted, updatedByDisplay, updatedAtFormatted } =
    useRuleAuditMetadata(rule);

  const badges = React.useMemo(() => getRuleDetailBadges(rule), [rule]);

  const headerMetadata = React.useMemo<AppHeaderMetadataItems>(
    () => [
      {
        type: 'text',
        label: i18n.translate('xpack.alertingV2.ruleDetails.header.createdBy', {
          defaultMessage: 'Created by',
        }),
        value: i18n.translate('xpack.alertingV2.ruleDetails.header.createdByValue', {
          defaultMessage: '{user} on {date}',
          values: { user: createdByDisplay, date: createdAtFormatted },
        }),
        'data-test-subj': 'ruleDetailsCreatedByMetadata',
      },
      {
        type: 'text',
        label: i18n.translate('xpack.alertingV2.ruleDetails.header.updatedBy', {
          defaultMessage: 'Last updated by',
        }),
        value: i18n.translate('xpack.alertingV2.ruleDetails.header.updatedByValue', {
          defaultMessage: '{user} on {date}',
          values: { user: updatedByDisplay, date: updatedAtFormatted },
        }),
        'data-test-subj': 'ruleDetailsUpdatedByMetadata',
      },
    ],
    [createdByDisplay, createdAtFormatted, updatedByDisplay, updatedAtFormatted]
  );

  const menu = React.useMemo(
    () =>
      getRuleDetailMenu({
        rule,
        onEdit,
        onToggleEnabled: handleToggleEnabled,
        isToggleLoading: isToggling,
        onClone,
        onDelete: showDeleteConfirmationModal,
      }),
    [rule, onEdit, handleToggleEnabled, isToggling, onClone, showDeleteConfirmationModal]
  );

  return (
    <KibanaPageTemplate
      paddingSize="none"
      bottomBorder={false}
      data-test-subj="alertingV2RuleDetailsPage"
      minHeight={0}
      grow={false}
      css={css`
        ${largeMediaQuery} {
          block-size: calc(var(--kbn-application--content-height, 100vh) - ${euiTheme.size.l} * 2);
        }
      `}
    >
      <AppHeader
        title={rule.metadata.name}
        back={{
          href: paths.ruleList,
          label: i18n.translate('xpack.alertingV2.ruleDetails.header.backToRulesLabel', {
            defaultMessage: 'Rules',
          }),
        }}
        badges={badges}
        metadata={headerMetadata}
        menu={canWrite ? menu : undefined}
        spacing="flush"
        sticky={false}
      />
      <KibanaPageTemplate.Section
        paddingSize="none"
        grow
        restrictWidth={false}
        css={css`
          min-height: 0;
          margin-block-start: ${euiTheme.border.width.thin};
        `}
        contentProps={{
          css: css`
            flex: 1 1;
            min-height: 0;
          `,
        }}
      >
        <EuiSplitPanel.Outer
          direction="row"
          hasBorder={false}
          hasShadow={false}
          data-test-subj="ruleDetailLayout"
          css={css`
            ${largeMediaQuery} {
              height: 100%;
            }
          `}
        >
          <EuiSplitPanel.Inner grow paddingSize="none" data-test-subj="ruleDetailOverviewColumn">
            <EuiPanel
              hasBorder={false}
              hasShadow={false}
              paddingSize="l"
              css={css`
                ${smallMediaQuery} {
                  ${logicalCSS('padding-horizontal', '0')}
                }
                ${largeMediaQuery} {
                  height: 100%;
                  overflow-y: auto;
                  ${logicalCSS('padding-left', '0')}
                }
              `}
            >
              <RuleOverviewSection />
            </EuiPanel>
          </EuiSplitPanel.Inner>
          <EuiSplitPanel.Inner
            grow={false}
            paddingSize="none"
            data-test-subj="ruleDetailSidebarColumn"
            css={css`
              min-height: 0;
              ${logicalCSS('padding-top', euiTheme.size.l)}

              ${largeMediaQuery} {
                ${logicalCSS('padding-top', '0')}
                flex-shrink: 0;
                flex-basis: 400px;
                min-width: 40px;
                max-width: 500px;
                height: 100%;
                overflow-y: auto;
                padding: ${euiTheme.size.l};
                ${logicalCSS('padding-right', '0')}
                border-left: ${euiTheme.border.thin};
              }
            `}
          >
            <RuleSidebar />
          </EuiSplitPanel.Inner>
        </EuiSplitPanel.Outer>
      </KibanaPageTemplate.Section>

      {showDeleteConfirmation && (
        <DeleteConfirmationModal
          onConfirm={handleRuleDelete}
          onCancel={() => setShowDeleteConfirmation(false)}
          ruleName={rule.metadata?.name ?? ''}
          isLoading={isDeleting}
        />
      )}
      {flyout}
    </KibanaPageTemplate>
  );
};
