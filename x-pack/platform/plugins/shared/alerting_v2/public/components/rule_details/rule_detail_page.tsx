/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonEmpty,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPageHeader,
  EuiSpacer,
  EuiTab,
  EuiTabs,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { CoreStart, useService } from '@kbn/core-di-browser';
import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';
import type { RuleApiResponse } from '../../services/rules_api';
import { RuleDetailsActionsMenu } from './rule_details_actions_menu';
import { useBreadcrumbs } from '../../hooks/use_breadcrumbs';
import { useDeleteRule } from '../../hooks/use_delete_rule';
import { DeleteConfirmationModal } from '../rule/modals/delete_confirmation_modal';
import { RuleHeaderDescription, RuleTitleWithBadges } from './rule_header_description';
import { RuleConditions } from './rule_conditions';
import { RuleMetadata } from './rule_metadata';
import { RuleOverviewTab } from './rule_overview_tab';
import { paths } from '../../constants';

type RuleDetailsTab = 'overview' | 'execution' | 'versions';

const tabs: Array<{ id: RuleDetailsTab; name: string }> = [
  {
    id: 'overview',
    name: i18n.translate('xpack.alertingV2.ruleDetails.tabs.overview', {
      defaultMessage: 'Overview',
    }),
  },
  {
    id: 'execution',
    name: i18n.translate('xpack.alertingV2.ruleDetails.tabs.execution', {
      defaultMessage: 'Execution',
    }),
  },
  {
    id: 'versions',
    name: i18n.translate('xpack.alertingV2.ruleDetails.tabs.versions', {
      defaultMessage: 'Versions',
    }),
  },
];

export interface RuleDetailPageProps {
  rule: RuleApiResponse;
}

export const RuleDetailPage: React.FunctionComponent<RuleDetailPageProps> = ({ rule }) => {
  useBreadcrumbs('rule_details', { ruleName: rule.metadata?.name });
  const { basePath } = useService(CoreStart('http'));

  const history = useHistory();
  const { mutate: deleteRule, isLoading: isDeleting } = useDeleteRule();
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [activeTab, setActiveTab] = useState<RuleDetailsTab>('overview');

  const showDeleteConfirmationModal = () => {
    setShowDeleteConfirmation(true);
  };

  const handleRuleDelete = () => {
    setShowDeleteConfirmation(false);
    deleteRule(rule.id, {
      onSuccess: () => {
        history.push('/');
      },
    });
  };

  return (
    <>
      <EuiPageHeader
        data-test-subj="ruleDetailsTitle"
        bottomBorder
        pageTitle={<RuleTitleWithBadges rule={rule} />}
        description={<RuleHeaderDescription rule={rule} />}
        rightSideItems={[
          <RuleDetailsActionsMenu
            key="actions"
            rule={rule}
            showDeleteConfirmation={showDeleteConfirmationModal}
          />,
          <EuiButtonEmpty
            aria-label={i18n.translate(
              'xpack.alertingV2.sections.ruleDetails.editRuleButtonLabel',
              { defaultMessage: 'Edit Rule' }
            )}
            data-test-subj="openEditRuleFlyoutButton"
            iconType="pencil"
            name="edit"
            href={basePath.prepend(paths.ruleEdit(rule.id))}
          >
            <FormattedMessage
              id="xpack.alertingV2.sections.ruleDetails.editRuleButtonLabel"
              defaultMessage="Edit Rule"
            />
          </EuiButtonEmpty>,
        ]}
      />

      <EuiSpacer size="l" />

      <EuiFlexGroup gutterSize="l" data-test-subj="ruleDetailsBody">
        <EuiFlexItem grow={7}>
          <EuiTabs data-test-subj="ruleDetailsTabs">
            {tabs.map((tab) => (
              <EuiTab
                key={tab.id}
                isSelected={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
                data-test-subj={`ruleDetailsTab-${tab.id}`}
              >
                {tab.name}
              </EuiTab>
            ))}
          </EuiTabs>
          <EuiSpacer size="l" />
          {activeTab === 'overview' && <RuleOverviewTab rule={rule} />}
          {activeTab === 'execution' && (
            <EuiEmptyPrompt
              iconType="clock"
              title={
                <h3>
                  {i18n.translate('xpack.alertingV2.ruleDetails.execution.comingSoon', {
                    defaultMessage: 'Execution history',
                  })}
                </h3>
              }
              body={
                <p>
                  {i18n.translate('xpack.alertingV2.ruleDetails.execution.comingSoonBody', {
                    defaultMessage: 'Execution history will be available in a future release.',
                  })}
                </p>
              }
              data-test-subj="ruleDetailsExecutionPlaceholder"
            />
          )}
          {activeTab === 'versions' && (
            <EuiEmptyPrompt
              iconType="document"
              title={
                <h3>
                  {i18n.translate('xpack.alertingV2.ruleDetails.versions.comingSoon', {
                    defaultMessage: 'Version history',
                  })}
                </h3>
              }
              body={
                <p>
                  {i18n.translate('xpack.alertingV2.ruleDetails.versions.comingSoonBody', {
                    defaultMessage: 'Version history will be available in a future release.',
                  })}
                </p>
              }
              data-test-subj="ruleDetailsVersionsPlaceholder"
            />
          )}
        </EuiFlexItem>
        <EuiFlexItem grow={3} data-test-subj="ruleDetailsSidebar">
          <RuleConditions rule={rule} />
          <EuiSpacer size="l" />
          <RuleMetadata rule={rule} />
        </EuiFlexItem>
      </EuiFlexGroup>

      {showDeleteConfirmation && (
        <DeleteConfirmationModal
          onConfirm={handleRuleDelete}
          onCancel={() => setShowDeleteConfirmation(false)}
          ruleName={rule.metadata?.name ?? ''}
          isLoading={isDeleting}
        />
      )}
    </>
  );
};
