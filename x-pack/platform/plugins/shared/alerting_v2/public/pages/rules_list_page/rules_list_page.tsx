/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiEmptyPrompt } from '@elastic/eui';
import { ContentList, ContentListProvider, ContentListToolbar } from '@kbn/content-list';
import { useService } from '@kbn/core-di-browser';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useBoolean } from '@kbn/react-hooks';
import { UserCapabilities } from '../../services/user_capabilities';
import { RULES_CONTENT_LIST_ID } from '../../constants';
import { useBreadcrumbs } from '../../hooks/use_breadcrumbs';
import { useComposeDiscoverFlyout } from '../../hooks/use_compose_discover_flyout';
import { useCreateFromTemplateQuery } from '../../hooks/use_create_from_template_query';
import { useNavigateToAgentBuilder } from '../../hooks/use_navigate_to_agent_builder';
import { RuleCreateOptionsPanel } from '../../components/rule_create_options/rule_create_options_panel';
import { RuleCreateOptionsFlyout } from '../../components/rule_create_options/rule_create_options_flyout';
import {
  KindFilter,
  RULES_LIST_FEATURES_FIELDS,
  StatusFilter,
  TagsFilter,
} from './rules_list_filters';
import { useAlertingLocators } from '../../application/locator_context';
import { RulesListHeader } from './rules_list_header';
import { RulesListTableContainer } from './rules_list_table_container';
import { useRulesDataSource } from './rules_data_source';

export const RulesListPage = () => {
  useBreadcrumbs('rules_list');

  const canWrite = useService(UserCapabilities).canWrite('rules');
  const dataSource = useRulesDataSource();

  const [
    isCreateOptionsFlyoutOpen,
    { on: openCreateOptionsFlyout, off: closeCreateOptionsFlyout },
  ] = useBoolean(false);

  // One history key for the whole create session so the form can stack on the
  // options picker and Back returns to it (rna-program#960 prototype).
  const createSessionHistoryKey = useMemo(() => Symbol('createRuleSession'), []);

  const {
    flyout,
    confirmationModal,
    closeFlyout,
    openCreateFlyout,
    openCreateBuilderFlyout,
    openCreateFromTemplateFlyout,
    openEditFlyout,
    openCloneFlyout,
  } = useComposeDiscoverFlyout({
    historyKey: createSessionHistoryKey,
    // Same historyKey as the options picker; both use session="start" so EUI
    // stacks history (form covers picker; Back returns). session="inherit" is
    // parent/child and lays out side-by-side on wide screens.
    onCreateSuccess: closeCreateOptionsFlyout,
  });

  useCreateFromTemplateQuery(openCreateFromTemplateFlyout);
  const navigateToAgentBuilder = useNavigateToAgentBuilder();
  const { rulesLocators } = useAlertingLocators();
  const navigateToSequenceBuilder = useCallback(() => {
    rulesLocators.navigateSync({ page: 'sequence_create' });
  }, [rulesLocators]);

  const handleCloseCreateOptionsFlyout = useCallback(() => {
    // Closing the picker exits the whole create session — also dismiss any form on top.
    closeFlyout();
    closeCreateOptionsFlyout();
  }, [closeFlyout, closeCreateOptionsFlyout]);

  // Keep the picker mounted underneath; open the authoring flyout on top.
  const onCreateEsqlRuleFromOptionsFlyout = () => {
    openCreateFlyout();
  };
  const onCreateWithAgentFromOptionsFlyout = () => {
    handleCloseCreateOptionsFlyout();
    navigateToAgentBuilder();
  };
  const onCreateThresholdRuleFromOptionsFlyout = () => {
    openCreateBuilderFlyout('threshold');
  };

  const emptyState = canWrite ? (
    <RuleCreateOptionsPanel
      onCreateEsqlRule={openCreateFlyout}
      onCreateWithAgent={navigateToAgentBuilder}
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
                  defaultMessage: 'Outcome',
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
          onBuildSequence={navigateToSequenceBuilder}
        />
        <ContentList emptyState={emptyState} data-test-subj="rulesList">
          <ContentListToolbar>
            <ContentListToolbar.Filters>
              <StatusFilter />
              <TagsFilter />
              <KindFilter />
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
          historyKey={createSessionHistoryKey}
          onClose={handleCloseCreateOptionsFlyout}
          onCreateEsqlRule={onCreateEsqlRuleFromOptionsFlyout}
          onCreateWithAgent={onCreateWithAgentFromOptionsFlyout}
          onCreateThresholdRule={onCreateThresholdRuleFromOptionsFlyout}
        />
      ) : null}
      {flyout}
      {confirmationModal}
    </div>
  );
};
