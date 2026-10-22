/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { EuiCallOut, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import { createMockChangeHistoryAdapter } from '@kbn/change-history-ui/mocks';
import { i18n } from '@kbn/i18n';
import type { LocatorPublic } from '@kbn/share-plugin/public';
import type { SerializableRecord } from '@kbn/utility-types';
import { MemoryRouter } from 'react-router-dom';
import {
  AutoOpenChangeHistoryModal,
  RuleChangeHistoryProvider,
  createRuleApiResponseFromHistoryFixtures,
  createRuleChangeHistoryFixtures,
} from '../../components/rule/modals/change_history';
import { LocatorProvider, type AlertingV2Locators } from '../../application/locator_context';
import type { RuleApiResponse } from '../../services/rules_api';
import { RulesListTable } from './rules_list_table';

const createStoryLocator = <P extends SerializableRecord>(id: string): LocatorPublic<P> => ({
  id,
  getLocation: async () => ({ app: 'alerting', path: '/', state: {} }),
  getUrl: async () => '#',
  getRedirectUrl: () => '#',
  navigate: async () => {},
  navigateSync: action(`${id}.navigateSync`),
  useUrl: () => '#',
  telemetry: (state, stats) => stats,
  inject: (state) => state,
  extract: (state) => ({ state, references: [] }),
  migrations: {},
});

const storyLocators: AlertingV2Locators = {
  rulesLocators: createStoryLocator('rules'),
  ruleLibraryLocators: createStoryLocator('ruleLibrary'),
  episodesLocators: createStoryLocator('episodes'),
  actionPolicyLocators: createStoryLocator('actionPolicies'),
  executionHistoryLocators: createStoryLocator('executionHistory'),
};

const BAD_WEATHER_ID = 'rule-bad-weather';
const QUIET_SKIES_ID = 'rule-quiet-skies';
const EMPTY_HISTORY_ID = 'rule-empty-history';

const createStoryRules = (): RuleApiResponse[] => [
  createRuleApiResponseFromHistoryFixtures({
    objectId: BAD_WEATHER_ID,
    name: 'Bad Weather',
    versionCount: 4,
  }),
  createRuleApiResponseFromHistoryFixtures({
    objectId: QUIET_SKIES_ID,
    name: 'Quiet Skies',
    versionCount: 1,
  }),
  createRuleApiResponseFromHistoryFixtures({
    objectId: EMPTY_HISTORY_ID,
    name: 'Legacy Pre-versioning',
    versionCount: 1,
  }),
];

const historyByRuleId: Record<string, ReturnType<typeof createRuleChangeHistoryFixtures>> = {
  [BAD_WEATHER_ID]: createRuleChangeHistoryFixtures({
    objectId: BAD_WEATHER_ID,
    name: 'Bad Weather',
    versionCount: 4,
  }),
  [QUIET_SKIES_ID]: createRuleChangeHistoryFixtures({
    objectId: QUIET_SKIES_ID,
    name: 'Quiet Skies',
    versionCount: 1,
  }),
  [EMPTY_HISTORY_ID]: createRuleChangeHistoryFixtures({
    objectId: EMPTY_HISTORY_ID,
    name: 'Legacy Pre-versioning',
    empty: true,
  }),
};

interface HistorySession {
  rule: RuleApiResponse;
  nonce: number;
}

const noop = () => undefined;

const RulesListChangeHistoryStory = (): JSX.Element => {
  const rules = useMemo(() => createStoryRules(), []);
  const [historySession, setHistorySession] = useState<HistorySession | undefined>();

  const onViewChangeHistory = useCallback((rule: RuleApiResponse) => {
    action('viewChangeHistory')(rule.id, rule.metadata.name);
    setHistorySession({ rule, nonce: Date.now() });
  }, []);

  const historyAdapter = useMemo(() => {
    if (!historySession) {
      return undefined;
    }

    return createMockChangeHistoryAdapter({
      changes: historyByRuleId[historySession.rule.id] ?? [],
    });
  }, [historySession]);

  return (
    <MemoryRouter>
      <LocatorProvider locators={storyLocators}>
        <EuiTitle size="s">
          <h2>
            {i18n.translate('xpack.alertingV2.rulesListChangeHistory.story.title', {
              defaultMessage: 'Rules list — change history',
            })}
          </h2>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiText size="s" color="subdued">
          {i18n.translate('xpack.alertingV2.rulesListChangeHistory.story.body', {
            defaultMessage:
              'Open a row’s More actions menu and choose View change history. Bad Weather has a full timeline, Quiet Skies has a single create version, and Legacy Pre-versioning shows the empty state.',
          })}
        </EuiText>
        <EuiSpacer size="m" />
        <EuiCallOut size="s" title="Mock adapter — no Kibana server required" iconType="info" />
        <EuiSpacer size="m" />
        <RulesListTable
          items={rules}
          totalItemCount={rules.length}
          page={1}
          perPage={20}
          search=""
          hasActiveFilters={false}
          isLoading={false}
          canWrite
          selectedCount={0}
          isAllSelected={false}
          isPageSelected={false}
          isRowSelected={() => false}
          onSelectRow={noop}
          onSelectPage={noop}
          onSelectAll={noop}
          onClearSelection={noop}
          onBulkEnable={noop}
          onBulkDisable={noop}
          onBulkDelete={noop}
          onOpenSummary={action('openSummary')}
          onQuickEdit={action('quickEdit')}
          onEdit={action('edit')}
          onClone={action('clone')}
          onDelete={action('delete')}
          onToggleEnabled={action('toggleEnabled')}
          onRun={action('run')}
          onViewChangeHistory={onViewChangeHistory}
          onTableChange={noop}
          onBulkUpdateApiKey={noop}
          onUpdateApiKey={noop}
        />
        {historySession && historyAdapter ? (
          <RuleChangeHistoryProvider
            key={`${historySession.rule.id}-${historySession.nonce}`}
            ruleId={historySession.rule.id}
            ruleName={historySession.rule.metadata.name}
            adapter={historyAdapter}
          >
            <AutoOpenChangeHistoryModal />
          </RuleChangeHistoryProvider>
        ) : null}
      </LocatorProvider>
    </MemoryRouter>
  );
};

const meta: Meta<typeof RulesListChangeHistoryStory> = {
  title: 'Alerting V2/Rules List/Change History',
  component: RulesListChangeHistoryStory,
  parameters: {
    layout: 'padded',
  },
};

export default meta;

type Story = StoryObj<typeof RulesListChangeHistoryStory>;

export const Default: Story = {};
