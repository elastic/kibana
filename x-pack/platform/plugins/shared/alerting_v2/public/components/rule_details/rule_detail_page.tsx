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
import type { AppHeaderBadge, AppHeaderMetadataItems } from '@kbn/app-header';
import { RULE_KIND_LABELS } from '@kbn/alerting-v2-constants';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { css } from '@emotion/react';
import { useService } from '@kbn/core-di-browser';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useHistory } from 'react-router-dom';
import { UserCapabilities } from '../../services/user_capabilities';
import { useRuleAutoAttach } from '../../agent_builder/use_rule_auto_attach';
import { useBreadcrumbs } from '../../hooks/use_breadcrumbs';
import { useRuleAuditMetadata } from '../../hooks/use_rule_audit_metadata';
import { useDeleteRule } from '../../hooks/use_delete_rule';
import { useComposeDiscoverFlyout } from '../../hooks/use_compose_discover_flyout';
import { useToggleRuleEnabled } from '../../hooks/use_toggle_rule_enabled';
import { useBulkUpdateRuleApiKey } from '../../hooks/use_bulk_update_rule_api_key';
import { useRunRule } from '../../hooks/use_run_rule';
import { paths } from '../../constants';
import { DeleteConfirmationModal } from '../rule/modals/delete_confirmation_modal';
import { useRuleChangeHistoryModal } from '../rule/modals/change_history';
import { getRuleDetailMenu } from './get_rule_detail_menu';
import { UpdateApiKeyConfirmationModal } from '../rule/modals/update_api_key_confirmation_modal';
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

export const RuleDetailPage: React.FunctionComponent = () => {
  const rule = useRule();
  useBreadcrumbs('rule_details', { ruleName: rule.metadata?.name });
  const { euiTheme } = useEuiTheme();

  const canWrite = useService(UserCapabilities).canWrite('rules');
  useRuleAutoAttach(rule);

  const smallMediaQuery = useEuiMaxBreakpoint('s');
  const largeMediaQuery = useEuiMinBreakpoint('m');

  const history = useHistory();
  const { mutate: deleteRule, isLoading: isDeleting } = useDeleteRule();
  const { mutate: toggleRuleEnabled, isLoading: isToggling } = useToggleRuleEnabled();
  const { mutate: updateRuleApiKey, isLoading: isUpdatingApiKey } = useBulkUpdateRuleApiKey();
  const { mutate: runRule } = useRunRule();
  const { flyout, confirmationModal, openEditFlyout, openCloneFlyout } = useComposeDiscoverFlyout();
  const { openChangeHistory, changeHistoryModal } = useRuleChangeHistoryModal();
  const [showDeleteConfirmation, setShowDeleteConfirmation] = React.useState(false);
  const [showUpdateApiKeyConfirmation, setShowUpdateApiKeyConfirmation] = React.useState(false);

  const showDeleteConfirmationModal = React.useCallback(() => {
    setShowDeleteConfirmation(true);
  }, []);

  const showUpdateApiKeyConfirmationModal = React.useCallback(() => {
    setShowUpdateApiKeyConfirmation(true);
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

  const handleUpdateApiKey = () => {
    updateRuleApiKey(
      { mode: 'by_ids', ids: [rule.id] },
      { onSettled: () => setShowUpdateApiKeyConfirmation(false) }
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

  const handleRunRule = React.useCallback(() => {
    runRule({ id: rule.id });
  }, [runRule, rule.id]);

  const onViewChangeHistory = React.useCallback(
    () => openChangeHistory({ id: rule.id, name: rule.metadata.name }),
    [openChangeHistory, rule.id, rule.metadata.name]
  );

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
        canWrite,
        onEdit,
        onToggleEnabled: handleToggleEnabled,
        isToggleLoading: isToggling,
        onClone,
        onUpdateApiKey: showUpdateApiKeyConfirmationModal,
        onDelete: showDeleteConfirmationModal,
        onRun: handleRunRule,
        onViewChangeHistory,
      }),
    [
      rule,
      canWrite,
      onEdit,
      handleToggleEnabled,
      isToggling,
      onClone,
      showDeleteConfirmationModal,
      handleRunRule,
      onViewChangeHistory,
      showUpdateApiKeyConfirmationModal,
    ]
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
        menu={menu}
        spacing="bleed"
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
      {showUpdateApiKeyConfirmation && (
        <UpdateApiKeyConfirmationModal
          onConfirm={handleUpdateApiKey}
          onCancel={() => setShowUpdateApiKeyConfirmation(false)}
          ruleName={rule.metadata?.name ?? ''}
          isLoading={isUpdatingApiKey}
        />
      )}
      {flyout}
      {confirmationModal}
      {changeHistoryModal}
    </KibanaPageTemplate>
  );
};
