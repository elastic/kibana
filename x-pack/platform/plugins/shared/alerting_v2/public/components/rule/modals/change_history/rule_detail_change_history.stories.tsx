/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import {
  EuiCallOut,
  EuiCode,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { AppHeader } from '@kbn/app-header';
import { MockChromeContextProvider } from '@kbn/core-chrome-browser-context-mocks';
import { useChangeHistoryModal } from '@kbn/change-history-ui';
import { createMockChangeHistoryAdapter } from '@kbn/change-history-ui/mocks';
import { i18n } from '@kbn/i18n';
import { MemoryRouter } from 'react-router-dom';
import { getRuleDetailMenu } from '../../../rule_details/get_rule_detail_menu';
import { RuleKindBadge } from '../../../rule_details/rule_summary_header';
import type { RuleApiResponse } from '../../../../services/rules_api';
import {
  RULE_CHANGE_HISTORY_STORY_OBJECT_ID,
  RuleChangeHistoryProvider,
  createRuleApiResponseFromHistoryFixtures,
  createRuleChangeHistoryFixtures,
} from '.';

const storyRule = (): RuleApiResponse =>
  createRuleApiResponseFromHistoryFixtures({ versionCount: 4 });

const RuleDetailChangeHistoryShell = ({
  rule,
  emptyHistory,
  canRestore,
}: {
  rule: RuleApiResponse;
  emptyHistory: boolean;
  canRestore: boolean;
}): JSX.Element => {
  const { openModal } = useChangeHistoryModal();

  const onViewChangeHistory = useCallback(() => {
    action('viewChangeHistory')();
    openModal();
  }, [openModal]);

  const menu = useMemo(
    () =>
      getRuleDetailMenu({
        rule,
        canWrite: true,
        onEdit: action('editRule'),
        onToggleEnabled: action('toggleEnabled'),
        isToggleLoading: false,
        onClone: action('cloneRule'),
        onDelete: action('deleteRule'),
        onRun: action('runRule'),
        onUpdateApiKey: action('updateApiKey'),
        onViewChangeHistory,
      }),
    [onViewChangeHistory, rule]
  );

  return (
    <>
      <AppHeader
        title={rule.metadata.name}
        badges={[
          {
            label: 'Alert',
            renderCustomBadge: () => <RuleKindBadge kind={rule.kind} />,
          },
          {
            label: rule.enabled ? 'Enabled' : 'Disabled',
            color: rule.enabled ? 'success' : 'default',
          },
        ]}
        metadata={[
          {
            type: 'text',
            label: 'Created by',
            value: `${rule.created_by} on Jul 22, 2026`,
          },
          {
            type: 'text',
            label: 'Last updated by',
            value: `${rule.updated_by} on Aug 1, 2026`,
          },
        ]}
        menu={menu}
        spacing="flush"
        sticky={false}
      />
      <EuiSpacer size="m" />
      <EuiPanel hasBorder paddingSize="l">
        <EuiFlexGroup direction="column" gutterSize="m">
          <EuiFlexItem>
            <EuiTitle size="s">
              <h2>
                {i18n.translate('xpack.alertingV2.ruleChangeHistory.story.title', {
                  defaultMessage: 'Rule details (Storybook shell)',
                })}
              </h2>
            </EuiTitle>
            <EuiText size="s" color="subdued">
              {i18n.translate('xpack.alertingV2.ruleChangeHistory.story.body', {
                defaultMessage:
                  'Open the More menu and choose View change history. Timeline rows show author and timestamp; select a version or use Compare to this version for a JSON diff preview.',
              })}
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiCallOut
              size="s"
              title={i18n.translate('xpack.alertingV2.ruleChangeHistory.story.callout', {
                defaultMessage: 'Mock adapter — no Kibana server required',
              })}
              iconType="info"
            >
              <p>
                History for <EuiCode>{rule.id}</EuiCode>
                {emptyHistory
                  ? ' is empty.'
                  : ` has ${canRestore ? 'restore + ' : ''}compare enabled.`}
              </p>
            </EuiCallOut>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    </>
  );
};

interface RuleDetailChangeHistoryStoryProps {
  emptyHistory?: boolean;
  canRestore?: boolean;
}

const RuleDetailChangeHistoryStory = ({
  emptyHistory = false,
  canRestore = false,
}: RuleDetailChangeHistoryStoryProps): JSX.Element => {
  const rule = useMemo(() => storyRule(), []);
  const adapter = useMemo(
    () =>
      createMockChangeHistoryAdapter({
        changes: emptyHistory ? [] : createRuleChangeHistoryFixtures(),
        ...(canRestore
          ? {
              onRestoreChange: async (params) => {
                action('restoreChange')(params);
              },
            }
          : {}),
      }),
    [canRestore, emptyHistory]
  );

  return (
    <MemoryRouter>
      <MockChromeContextProvider>
        <RuleChangeHistoryProvider
          ruleId={RULE_CHANGE_HISTORY_STORY_OBJECT_ID}
          ruleName={rule.metadata.name}
          adapter={adapter}
          canRestore={canRestore}
        >
          <RuleDetailChangeHistoryShell
            rule={rule}
            emptyHistory={emptyHistory}
            canRestore={canRestore}
          />
        </RuleChangeHistoryProvider>
      </MockChromeContextProvider>
    </MemoryRouter>
  );
};

const meta: Meta<typeof RuleDetailChangeHistoryStory> = {
  title: 'Alerting V2/Rule Details/Change History',
  component: RuleDetailChangeHistoryStory,
  parameters: {
    layout: 'padded',
  },
};

export default meta;

type Story = StoryObj<typeof RuleDetailChangeHistoryStory>;

export const Default: Story = {};

export const WithRestore: Story = {
  args: {
    canRestore: true,
  },
};

export const EmptyHistory: Story = {
  args: {
    emptyHistory: true,
  },
};
