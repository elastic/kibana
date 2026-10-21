/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiEmptyPrompt } from '@elastic/eui';
import { ContentList, ContentListProvider, ContentListToolbar } from '@kbn/content-list';
import { CoreStart, useService } from '@kbn/core-di-browser';
import { AGENT_BUILDER_APP_ID } from '@kbn/deeplinks-agent-builder';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useBoolean } from '@kbn/react-hooks';
import { triggersActionsRoute } from '@kbn/rule-data-utils';
import { UserCapabilities } from '../../services/user_capabilities';
import {
  AGENT_BUILDER_NEW_CONVERSATION_PATH,
  CREATE_WITH_AGENT_INITIAL_PROMPT,
  RULES_CONTENT_LIST_ID,
} from '../../constants';
import { useBreadcrumbs } from '../../hooks/use_breadcrumbs';
import { useComposeDiscoverFlyout } from '../../hooks/use_compose_discover_flyout';
import { useCreateFromTemplateQuery } from '../../hooks/use_create_from_template_query';
import { useNavigateToAgentBuilder } from '../../hooks/use_navigate_to_agent_builder';
import { RuleCreateOptionsFlyout } from '../../components/rule_create_options/rule_create_options_flyout';
import {
  KindFilter,
  RULES_LIST_FEATURES_FIELDS,
  StatusFilter,
  TagsFilter,
} from './rules_list_filters';
import { useAlertingLocators } from '../../application/locator_context';
import { useHostTabs } from '../../application/tabs_context';
import { RulesListHeader } from './rules_list_header';
import { RulesListTableContainer } from './rules_list_table_container';
import { useRulesDataSource } from './rules_data_source';
import { EsqlRulesIntroBanner } from './esql_rules_intro_banner';
import { EsqlRulesEmptyState } from './esql_rules_empty_state';
import { AlertingOnboardingModal } from './alerting_onboarding_modal';

export const RulesListPage = () => {
  useBreadcrumbs('rules_list');

  const canWrite = useService(UserCapabilities).canWrite('rules');
  const dataSource = useRulesDataSource();

  const [
    isCreateOptionsFlyoutOpen,
    { on: openCreateOptionsFlyout, off: closeCreateOptionsFlyout },
  ] = useBoolean(false);
  const [
    isOnboardingModalOpen,
    { on: openOnboardingModal, off: closeOnboardingModal },
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
  const documentationHref = useService(CoreStart('docLinks')).links.alerting.guide;
  const { navigateToApp, navigateToUrl } = useService(CoreStart('application'));
  const http = useService(CoreStart('http'));
  const hostTabs = useHostTabs();
  const { rulesLocators, actionPolicyLocators } = useAlertingLocators();
  const navigateToSequenceBuilder = useCallback(() => {
    rulesLocators.navigateSync({ page: 'sequence_create' });
  }, [rulesLocators]);
  const navigateToCreateActionPolicy = useCallback(() => {
    actionPolicyLocators.navigateSync({ page: 'create' });
  }, [actionPolicyLocators]);

  const classicRulesHref =
    hostTabs?.find((tab) => tab.id === 'v1Rules')?.href ??
    http.basePath.prepend(triggersActionsRoute);

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

  const onCreateEsqlFromOnboarding = useCallback(() => {
    closeOnboardingModal();
    openCreateFlyout();
  }, [closeOnboardingModal, openCreateFlyout]);

  const onCreateThresholdFromOnboarding = useCallback(() => {
    closeOnboardingModal();
    openCreateBuilderFlyout('threshold');
  }, [closeOnboardingModal, openCreateBuilderFlyout]);

  const onCreateWithAgentFromOnboarding = useCallback(
    (userInput?: string) => {
      closeOnboardingModal();
      const trimmed = userInput?.trim();
      navigateToApp(AGENT_BUILDER_APP_ID, {
        path: AGENT_BUILDER_NEW_CONVERSATION_PATH,
        state: {
          initialMessage: trimmed
            ? `Load the rule-management skill and help me create an alerting rule for: ${trimmed}`
            : CREATE_WITH_AGENT_INITIAL_PROMPT,
        },
      });
    },
    [closeOnboardingModal, navigateToApp]
  );

  const onBuildSequenceFromOnboarding = useCallback(() => {
    closeOnboardingModal();
    navigateToSequenceBuilder();
  }, [closeOnboardingModal, navigateToSequenceBuilder]);

  const onCreateActionPolicyFromOnboarding = useCallback(() => {
    closeOnboardingModal();
    navigateToCreateActionPolicy();
  }, [closeOnboardingModal, navigateToCreateActionPolicy]);

  const onBrowseClassicFromOnboarding = useCallback(
    (search?: string) => {
      closeOnboardingModal();
      const trimmed = search?.trim();
      const href =
        trimmed && classicRulesHref
          ? `${classicRulesHref}${classicRulesHref.includes('?') ? '&' : '?'}search=${encodeURIComponent(
              trimmed
            )}`
          : classicRulesHref;
      void navigateToUrl(href);
    },
    [classicRulesHref, closeOnboardingModal, navigateToUrl]
  );

  const emptyState = canWrite ? (
    <EsqlRulesEmptyState
      onCreateRule={openCreateOptionsFlyout}
      onHelpMeOnboard={openOnboardingModal}
      documentationHref={documentationHref}
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
          onHelpMeOnboard={openOnboardingModal}
        />
        <EsqlRulesIntroBanner />
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
      {isOnboardingModalOpen ? (
        <AlertingOnboardingModal
          onClose={closeOnboardingModal}
          onCreateEsqlRule={onCreateEsqlFromOnboarding}
          onCreateThresholdRule={onCreateThresholdFromOnboarding}
          onCreateWithAgent={onCreateWithAgentFromOnboarding}
          onBuildSequence={onBuildSequenceFromOnboarding}
          onBrowseClassic={onBrowseClassicFromOnboarding}
          onCreateActionPolicy={onCreateActionPolicyFromOnboarding}
          documentationHref={documentationHref}
        />
      ) : null}
      {flyout}
      {confirmationModal}
    </div>
  );
};
