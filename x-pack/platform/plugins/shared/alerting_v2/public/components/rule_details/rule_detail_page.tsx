/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty, EuiPageHeader, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { CoreStart, useService } from '@kbn/core-di-browser';
import React from 'react';
import { useHistory } from 'react-router-dom';
import { RuleDetailsActionsMenu } from './rule_details_actions_menu';
import { useBreadcrumbs } from '../../hooks/use_breadcrumbs';
import { useDeleteRule } from '../../hooks/use_delete_rule';
import { DeleteConfirmationModal } from '../rule/modals/delete_confirmation_modal';
import { RuleHeaderDescription, RuleTitleWithBadges } from './rule_header_description';
import { RuleSidebar } from './sidebar/rule_sidebar';
import { useRule } from './rule_context';
import { paths } from '../../constants';

export const RuleDetailPage: React.FunctionComponent = () => {
  const rule = useRule();
  useBreadcrumbs('rule_details', { ruleName: rule.metadata?.name });
  const { basePath } = useService(CoreStart('http'));

  const history = useHistory();
  const { mutate: deleteRule, isLoading: isDeleting } = useDeleteRule();
  const [showDeleteConfirmation, setShowDeleteConfirmation] = React.useState(false);

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
        pageTitle={<RuleTitleWithBadges />}
        description={<RuleHeaderDescription />}
        rightSideItems={[
          <RuleDetailsActionsMenu
            key="actions"
            showDeleteConfirmation={showDeleteConfirmationModal}
          />,
          <EuiButtonEmpty
            aria-label={i18n.translate(
              'xpack.alertingV2.sections.ruleDetails.editRuleButtonLabel',
              { defaultMessage: 'Edit Rule' }
            )}
            data-test-subj="openEditRuleFlyoutButton"
            color="text"
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

      <RuleSidebar />

      <EuiSpacer size="l" />
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
