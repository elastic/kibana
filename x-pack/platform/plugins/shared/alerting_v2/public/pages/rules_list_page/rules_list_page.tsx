/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiEmptyPrompt } from '@elastic/eui';
import { useService } from '@kbn/core-di-browser';
import { FormattedMessage } from '@kbn/i18n-react';
import { useBoolean } from '@kbn/react-hooks';
import { UserCapabilities } from '../../services/user_capabilities';
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
import { RulesListHeader } from './rules_list_header';
import { RulesListTable } from './rules_list_table';

export const RulesListPage = () => {
  useBreadcrumbs('rules_list');

  const canWrite = useService(UserCapabilities).canWrite('rules');

  const [
    isCreateOptionsFlyoutOpen,
    { on: openCreateOptionsFlyout, off: closeCreateOptionsFlyout },
  ] = useBoolean(false);
  const { flyout, openCreateFlyout, openCreateBuilderFlyout, openEditFlyout, openCloneFlyout } =
    useComposeDiscoverFlyout();
  const navigateToAgentBuilder = useNavigateToAgentBuilder();
  const isRuleManagementABSkillAvailable = useIsRuleManagementABSkillAvailable();
  const abSkillRequirements = useRuleManagementABSkillRequirements();
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
      <RulesListTable
        header={
          <RulesListHeader
            canWrite={canWrite}
            onCreateRule={openCreateOptionsFlyout}
            onCreateEsqlRule={openCreateFlyout}
            onCreateWithAgent={navigateToAgentBuilder}
            createWithAgentDisabled={!isRuleManagementABSkillAvailable}
            createWithAgentTooltipText={createWithAgentTooltipText}
          />
        }
        emptyState={emptyState}
        onEditInFlyout={openEditFlyout}
        onCloneInFlyout={openCloneFlyout}
      />
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
