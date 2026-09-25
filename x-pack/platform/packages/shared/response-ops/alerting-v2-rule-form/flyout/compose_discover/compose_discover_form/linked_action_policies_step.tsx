/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import type { HttpStart } from '@kbn/core-http-browser';
import { i18n } from '@kbn/i18n';
import { KbnDangerCallout } from '@kbn/ui-callout';
import { useQueryClient } from '@kbn/react-query';
import React, { useState } from 'react';
import { useWatch } from 'react-hook-form';
import type { FormValues } from '../../../form/types';
import { MatchedPolicyReason } from './matched_policy_reason';
import { useActionPolicyConnectorTypes } from './use_action_policy_connector_types';
import {
  MATCHED_ACTION_POLICIES_QUERY_KEY,
  useMatchedActionPolicies,
} from './use_matched_action_policies';
import { WorkflowConnectorIcons } from './workflow_connector_icons';

const actionPoliciesTitle = i18n.translate(
  'xpack.responseOps.alertingV2RuleForm.linkedActionPolicies.title',
  { defaultMessage: 'Action policies' }
);

const matchingSubtext = i18n.translate(
  'xpack.responseOps.alertingV2RuleForm.linkedActionPolicies.matchingSubtext',
  {
    defaultMessage:
      'These policies match this rule by catch-all or tag. Policies with a query condition may also match at dispatch time based on alert data.',
  }
);

const emptyStateLabel = i18n.translate(
  'xpack.responseOps.alertingV2RuleForm.linkedActionPolicies.noMatchesEmptyState',
  { defaultMessage: 'No action policies match yet.' }
);

const errorTitle = i18n.translate(
  'xpack.responseOps.alertingV2RuleForm.linkedActionPolicies.errorTitle',
  { defaultMessage: 'Failed to load linked action policies' }
);

// TODO: replace with paths.actionPolicyEdit from alerting_v2/public/constants.ts
//       once exported from the plugin or moved to a shared package.
const ACTION_POLICY_EDIT_BASE = '/app/management/alertingV2/action_policies/edit';

const getEditLabel = (name: string) =>
  i18n.translate('xpack.responseOps.alertingV2RuleForm.linkedActionPolicies.editPolicyLink', {
    defaultMessage: 'Edit {name}',
    values: { name },
  });

interface Props {
  http: HttpStart;
  CreateActionPolicyFormFlyout?: React.ComponentType<{
    onClose: () => void;
    onSuccess: () => void;
  }>;
}

export const LinkedActionPoliciesStep = ({ http, CreateActionPolicyFormFlyout }: Props) => {
  const metadata = useWatch<FormValues, 'metadata'>({ name: 'metadata' });
  const tags = metadata?.tags;
  const queryClient = useQueryClient();
  const [isCreateFlyoutOpen, setIsCreateFlyoutOpen] = useState(false);

  const { isLoading, error, items } = useMatchedActionPolicies({ http, tags });
  const ruleTags = tags ?? [];

  const { connectorTypesByPolicy } = useActionPolicyConnectorTypes(
    items.map(({ action_policy: actionPolicy }) => actionPolicy)
  );

  return (
    <>
      <EuiTitle size="xs">
        <h3>{actionPoliciesTitle}</h3>
      </EuiTitle>
      <EuiSpacer size="xs" />
      <EuiText size="s" color="subdued">
        <p>{matchingSubtext}</p>
      </EuiText>
      <EuiSpacer size="m" />

      {isLoading && <EuiLoadingSpinner size="m" data-test-subj="linkedActionPoliciesLoading" />}

      {error && (
        <KbnDangerCallout
          announceOnMount
          title={errorTitle}
          data-test-subj="linkedActionPoliciesError"
          text={error.message}
        />
      )}

      {!isLoading &&
        !error &&
        (items.length === 0 ? (
          <EuiPanel
            color="subdued"
            hasShadow={false}
            paddingSize="l"
            data-test-subj="linkedActionPoliciesEmpty"
          >
            <EuiText size="s" color="subdued" textAlign="center">
              <p>{emptyStateLabel}</p>
            </EuiText>
          </EuiPanel>
        ) : (
          <EuiFlexGroup direction="column" gutterSize="s" data-test-subj="linkedActionPoliciesList">
            {items.map(({ action_policy: actionPolicy, category }) => {
              const editLabel = getEditLabel(actionPolicy.name);
              const connectorTypes = connectorTypesByPolicy.get(actionPolicy.id) ?? [];
              return (
                <EuiFlexItem key={actionPolicy.id}>
                  <EuiPanel
                    hasBorder
                    hasShadow={false}
                    paddingSize="s"
                    data-test-subj={`linkedActionPolicyRow-${actionPolicy.id}`}
                  >
                    <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                      <EuiFlexItem grow={false}>
                        <EuiLink
                          href={http.basePath.prepend(
                            `${ACTION_POLICY_EDIT_BASE}/${encodeURIComponent(actionPolicy.id)}`
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                          external={false}
                          aria-label={editLabel}
                          data-test-subj={`linkedActionPolicyEdit-${actionPolicy.id}`}
                        >
                          {actionPolicy.name}
                        </EuiLink>
                      </EuiFlexItem>
                      <EuiFlexItem grow>
                        <WorkflowConnectorIcons
                          types={connectorTypes}
                          data-test-subj={`linkedActionPolicyConnectorIcons-${actionPolicy.id}`}
                        />
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <MatchedPolicyReason
                          category={category}
                          matcher={actionPolicy.matcher}
                          ruleTags={ruleTags}
                        />
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiPanel>
                </EuiFlexItem>
              );
            })}
          </EuiFlexGroup>
        ))}

      {CreateActionPolicyFormFlyout && (
        <>
          <EuiSpacer size="m" />
          <EuiButton
            iconType="plus"
            onClick={() => setIsCreateFlyoutOpen(true)}
            data-test-subj="createActionPolicyButton"
          >
            {i18n.translate(
              'xpack.responseOps.alertingV2RuleForm.linkedActionPolicies.createButton',
              { defaultMessage: 'Create action policy' }
            )}
          </EuiButton>
        </>
      )}

      {CreateActionPolicyFormFlyout && isCreateFlyoutOpen && (
        <CreateActionPolicyFormFlyout
          onClose={() => setIsCreateFlyoutOpen(false)}
          onSuccess={() => {
            setIsCreateFlyoutOpen(false);
            queryClient.invalidateQueries({ queryKey: MATCHED_ACTION_POLICIES_QUERY_KEY });
          }}
        />
      )}
    </>
  );
};
