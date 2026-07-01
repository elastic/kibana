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
import { i18n } from '@kbn/i18n';
import moment from 'moment';
import React from 'react';
import { useHistory } from 'react-router-dom';
import { useBreadcrumbs } from '../../hooks/use_breadcrumbs';
import { useDeleteRule } from '../../hooks/use_delete_rule';
import { useComposeDiscoverFlyout } from '../../hooks/use_compose_discover_flyout';
import { useToggleRuleEnabled } from '../../hooks/use_toggle_rule_enabled';
import { useBulkGetUserProfiles } from '../../hooks/use_bulk_get_user_profiles';
import { resolveDisplayName } from '../../utils/resolve_display_name';
import { paths } from '../../constants';
import { DeleteConfirmationModal } from '../rule/modals/delete_confirmation_modal';
import { RuleHeaderDescription, RuleKindBadge } from './rule_header_description';
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

const getRuleDetailMetadata = ({
  createdByName,
  createdAt,
  updatedByName,
  updatedAt,
  formatDate,
}: {
  createdByName: string;
  createdAt: string;
  updatedByName: string;
  updatedAt: string;
  formatDate: (isoDate: string) => string;
}): AppHeaderMetadataItems => {
  const userOnDate = (name: string, isoDate: string) =>
    i18n.translate('xpack.alertingV2.ruleDetails.header.userOnDate', {
      defaultMessage: '{name} on {date}',
      values: { name, date: formatDate(isoDate) },
    });

  return [
    {
      type: 'text',
      label: i18n.translate('xpack.alertingV2.ruleDetails.header.createdByLabel', {
        defaultMessage: 'Created by',
      }),
      value: userOnDate(createdByName, createdAt),
      'data-test-subj': 'ruleCreatedByMetadata',
    },
    {
      type: 'text',
      label: i18n.translate('xpack.alertingV2.ruleDetails.header.lastUpdateByLabel', {
        defaultMessage: 'Last update by',
      }),
      value: userOnDate(updatedByName, updatedAt),
      'data-test-subj': 'ruleUpdatedByMetadata',
    },
  ];
};

const getRuleDetailMenu = ({
  rule,
  onEdit,
  onToggleEnabled,
  onClone,
  onDelete,
}: {
  rule: RuleApiResponse;
  onEdit: () => void;
  onToggleEnabled: () => void;
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
  items: [
    {
      id: rule.enabled ? 'disableRule' : 'enableRule',
      label: rule.enabled
        ? i18n.translate('xpack.alertingV2.ruleDetails.disableRuleButtonLabel', {
            defaultMessage: 'Disable rule',
          })
        : i18n.translate('xpack.alertingV2.ruleDetails.enableRuleButtonLabel', {
            defaultMessage: 'Enable rule',
          }),
      iconType: rule.enabled ? 'stop' : 'play',
      order: 0,
      run: onToggleEnabled,
      testId: rule.enabled ? 'ruleDetailsDisableButton' : 'ruleDetailsEnableButton',
    },
    {
      id: 'cloneRule',
      label: i18n.translate('xpack.alertingV2.ruleDetails.cloneRuleButtonLabel', {
        defaultMessage: 'Clone rule',
      }),
      iconType: 'copy',
      order: 1,
      run: onClone,
      testId: 'ruleDetailsCloneButton',
    },
    {
      id: 'deleteRule',
      label: i18n.translate('xpack.alertingV2.ruleDetails.deleteRuleButtonLabel', {
        defaultMessage: 'Delete rule',
      }),
      iconType: 'trash',
      order: 2,
      run: onDelete,
      testId: 'ruleDetailsDeleteButton',
      overflow: true,
      separator: 'above',
    },
  ],
});

export const RuleDetailPage: React.FunctionComponent = () => {
  const rule = useRule();
  useBreadcrumbs('rule_details', { ruleName: rule.metadata?.name });
  const { euiTheme } = useEuiTheme();

  const smallMediaQuery = useEuiMaxBreakpoint('s');
  const largeMediaQuery = useEuiMinBreakpoint('m');

  const history = useHistory();
  const { mutate: deleteRule, isLoading: isDeleting } = useDeleteRule();
  const { mutate: toggleRuleEnabled } = useToggleRuleEnabled();
  const { flyout, openEditFlyout, openCloneFlyout } = useComposeDiscoverFlyout();
  const [showDeleteConfirmation, setShowDeleteConfirmation] = React.useState(false);

  const profileUids = React.useMemo(
    () => [rule.createdBy, rule.updatedBy].filter((uid): uid is string => Boolean(uid)),
    [rule.createdBy, rule.updatedBy]
  );
  const { data: profileByUid } = useBulkGetUserProfiles({ uids: profileUids });

  const headerMetadata = getRuleDetailMetadata({
    createdByName: resolveDisplayName(rule.createdBy, profileByUid),
    createdAt: rule.createdAt,
    updatedByName: resolveDisplayName(rule.updatedBy, profileByUid),
    updatedAt: rule.updatedAt,
    formatDate: (isoDate) => moment(isoDate).format('ll'),
  });

  const showDeleteConfirmationModal = () => {
    setShowDeleteConfirmation(true);
  };

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

  const handleToggleEnabled = () => {
    toggleRuleEnabled({
      id: rule.id,
      enabled: !rule.enabled,
    });
  };

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
        badges={getRuleDetailBadges(rule)}
        metadata={headerMetadata}
        menu={getRuleDetailMenu({
          rule,
          onEdit: () => openEditFlyout(rule),
          onToggleEnabled: handleToggleEnabled,
          onClone: () => openCloneFlyout(rule),
          onDelete: showDeleteConfirmationModal,
        })}
        padding={{ bleed: 'l' }}
        sticky={false}
      />
      <KibanaPageTemplate.Section
        paddingSize="none"
        grow
        restrictWidth={false}
        css={css`
          min-height: 0;
        `}
        contentProps={{
          css: css`
            flex: 1 1;
            min-height: 0;
          `,
        }}
      >
        <RuleHeaderDescription showTags={false} />
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
