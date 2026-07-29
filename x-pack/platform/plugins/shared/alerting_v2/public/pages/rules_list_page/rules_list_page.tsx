/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCallOut, EuiEmptyPrompt } from '@elastic/eui';
import { ContentList, ContentListProvider, ContentListToolbar } from '@kbn/content-list';
import { useContentListItems } from '@kbn/content-list-provider';
import { useService } from '@kbn/core-di-browser';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useBoolean } from '@kbn/react-hooks';
import { UserCapabilities } from '../../services/user_capabilities';
import { RULES_CONTENT_LIST_ID } from '../../constants';
import { useBreadcrumbs } from '../../hooks/use_breadcrumbs';
import { useComposeDiscoverFlyout } from '../../hooks/use_compose_discover_flyout';
import {
  useIsRuleManagementABSkillAvailable,
  useRuleManagementABSkillRequirements,
} from '../../hooks/use_is_rule_management_ab_skill_available';
import { useNavigateToAgentBuilder } from '../../hooks/use_navigate_to_agent_builder';
import {
  RuleCreateOptionsPanel,
  getCreateWithAgentTooltipText,
} from '../../components/rule_create_options/rule_create_options_panel';
import { RuleCreateOptionsFlyout } from '../../components/rule_create_options/rule_create_options_flyout';
import {
  ModeFilter,
  RULES_LIST_FEATURES_FIELDS,
  StatusFilter,
  TagsFilter,
} from './rules_list_filters';
import { RulesListHeader } from './rules_list_header';
import { RulesListTableContainer } from './rules_list_table_container';
import { useRulesDataSource } from './rules_data_source';

const RulesListErrorCallout = () => {
  const { error } = useContentListItems();
  if (!error) {
    return null;
  }

  return (
    <EuiCallOut
      announceOnMount
      title={
        <FormattedMessage
          id="xpack.alertingV2.rulesList.loadErrorTitle"
          defaultMessage="Failed to load rules"
        />
      }
      color="danger"
      iconType="error"
    >
      {error instanceof Error ? error.message : String(error)}
    </EuiCallOut>
  );
};

export const RulesListPage = () => {
  useBreadcrumbs('rules_list');

  const canWrite = useService(UserCapabilities).canWrite('rules');
  const dataSource = useRulesDataSource();

  const [
    isCreateOptionsFlyoutOpen,
    { on: openCreateOptionsFlyout, off: closeCreateOptionsFlyout },
  ] = useBoolean(false);
  const { flyout, openCreateFlyout, openCreateBuilderFlyout, openEditFlyout, openCloneFlyout } =
    useComposeDiscoverFlyout();
  const navigateToAgentBuilder = useNavigateToAgentBuilder();
  const isRuleManagementABSkillAvailable = useIsRuleManagementABSkillAvailable();
  const abSkillRequirements = useRuleManagementABSkillRequirements();
  // We always render the "Create with agent" entry points; when the skill is unavailable they
  // are shown disabled with a tooltip naming the missing prerequisite rather than hidden.
  const createWithAgentTooltipText = getCreateWithAgentTooltipText(abSkillRequirements);

  const onCreateEsqlRuleFromOptionsFlyout = () => {
    closeCreateOptionsFlyout();
    openCreateFlyout();
  };
  const onCreateWithAgentFromOptionsFlyout = () => {
    closeCreateOptionsFlyout();
    navigateToAgentBuilder();
  };
  const onCreateThresholdRuleFromOptionsFlyout = () => {
    closeCreateOptionsFlyout();
    openCreateBuilderFlyout('threshold');
  };

  const emptyState = canWrite ? (
    <RuleCreateOptionsPanel
      onCreateEsqlRule={openCreateFlyout}
      onCreateWithAgent={navigateToAgentBuilder}
      createWithAgentDisabled={!isRuleManagementABSkillAvailable}
      createWithAgentTooltipText={createWithAgentTooltipText}
      onCreateThresholdRule={onCreateThresholdRuleFromOptionsFlyout}
    />
  ) : (
    <EuiEmptyPrompt
      iconType="bell"
      data-test-subj="rulesListReadOnlyEmpty"
      title={
        <h2>
          <FormattedMessage
            id="xpack.alertingV2.rulesList.readOnlyEmptyTitle"
            defaultMessage="No rules"
          />
        </h2>
      }
      body={
        <p>
          <FormattedMessage
            id="xpack.alertingV2.rulesList.readOnlyEmptyBody"
            defaultMessage="There are no rules to display."
          />
        </p>
      }
    />
  );

  return (
    <div>
      <ContentListProvider
        id={RULES_CONTENT_LIST_ID}
        queryKeyScope={RULES_CONTENT_LIST_ID}
        labels={{
          entity: i18n.translate('xpack.alertingV2.rulesList.entity', {
            defaultMessage: 'rule',
          }),
          entityPlural: i18n.translate('xpack.alertingV2.rulesList.entityPlural', {
            defaultMessage: 'rules',
          }),
          searchPlaceholder: i18n.translate('xpack.alertingV2.rulesList.searchPlaceholder', {
            defaultMessage: 'Search rules',
          }),
        }}
        dataSource={dataSource}
        features={{
          sorting: {
            initialSort: { field: 'name', direction: 'asc' },
            fields: [
              {
                field: 'name',
                name: i18n.translate('xpack.alertingV2.rulesList.sort.name', {
                  defaultMessage: 'Name',
                }),
              },
              {
                field: 'kind',
                name: i18n.translate('xpack.alertingV2.rulesList.sort.kind', {
                  defaultMessage: 'Mode',
                }),
              },
              {
                field: 'enabled',
                name: i18n.translate('xpack.alertingV2.rulesList.sort.enabled', {
                  defaultMessage: 'Enabled',
                }),
              },
            ],
          },
          pagination: { initialPageSize: 20 },
          search: true,
          // useBulkSelect owns selection — Content List's page-scoped selectedIds
          // cannot express select-all-with-exclusions.
          selection: false,
          fields: RULES_LIST_FEATURES_FIELDS,
        }}
      >
        <RulesListHeader
          canWrite={canWrite}
          onCreateRule={openCreateOptionsFlyout}
          onCreateEsqlRule={openCreateFlyout}
          onCreateWithAgent={navigateToAgentBuilder}
          createWithAgentDisabled={!isRuleManagementABSkillAvailable}
          createWithAgentTooltipText={createWithAgentTooltipText}
        />
        <ContentList emptyState={emptyState} data-test-subj="rulesList">
          <RulesListErrorCallout />
          <ContentListToolbar>
            <ContentListToolbar.Filters>
              <StatusFilter />
              <TagsFilter />
              <ModeFilter />
            </ContentListToolbar.Filters>
          </ContentListToolbar>
          <RulesListTableContainer
            onEditInFlyout={openEditFlyout}
            onCloneInFlyout={openCloneFlyout}
          />
        </ContentList>
      </ContentListProvider>
      {isCreateOptionsFlyoutOpen ? (
        <RuleCreateOptionsFlyout
          onClose={closeCreateOptionsFlyout}
          onCreateEsqlRule={onCreateEsqlRuleFromOptionsFlyout}
          onCreateWithAgent={onCreateWithAgentFromOptionsFlyout}
          createWithAgentDisabled={!isRuleManagementABSkillAvailable}
          createWithAgentTooltipText={createWithAgentTooltipText}
          onCreateThresholdRule={onCreateThresholdRuleFromOptionsFlyout}
        />
      ) : null}
      {flyout}
    </div>
  );
};
