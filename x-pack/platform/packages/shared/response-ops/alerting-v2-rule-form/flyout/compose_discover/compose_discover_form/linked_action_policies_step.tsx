/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiLink,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  EuiSplitPanel,
  EuiText,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import type { HttpStart } from '@kbn/core-http-browser';
import { i18n } from '@kbn/i18n';
import { KbnDangerCallout } from '@kbn/ui-callout';
import { useQueryClient } from '@kbn/react-query';
import React, { Fragment, useState } from 'react';
import { useWatch } from 'react-hook-form';
import type { FormValues } from '../../../form/types';
import { RoutingTagsField } from '../../../form/fields/routing_tags_field';
import { MatchedPolicyReason } from './matched_policy_reason';
import { useActionPolicyConnectorTypes } from './use_action_policy_connector_types';
import {
  matchedActionPoliciesQueryKey,
  useMatchedActionPolicies,
} from './use_matched_action_policies';
import { WorkflowConnectorIcons } from './workflow_connector_icons';

const actionPoliciesTitle = i18n.translate(
  'xpack.responseOps.alertingV2RuleForm.linkedActionPolicies.title',
  { defaultMessage: 'Action policies' }
);

const actionPoliciesDescription = i18n.translate(
  'xpack.responseOps.alertingV2RuleForm.linkedActionPolicies.description',
  {
    defaultMessage:
      'Routing tags determine which action policies apply. Catch-all action policies match all alerts.',
  }
);

const appliedPoliciesTitle = i18n.translate(
  'xpack.responseOps.alertingV2RuleForm.linkedActionPolicies.appliedPoliciesTitle',
  { defaultMessage: 'Applied policies' }
);

const createActionPolicyLabel = i18n.translate(
  'xpack.responseOps.alertingV2RuleForm.linkedActionPolicies.createLink',
  { defaultMessage: 'Create action policy' }
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
  createActionPolicyDisabledReason?: string;
  CreateActionPolicyFormFlyout?: React.ComponentType<{
    onClose: () => void;
    onSuccess: () => void;
  }>;
}

export const LinkedActionPoliciesStep = ({
  http,
  createActionPolicyDisabledReason,
  CreateActionPolicyFormFlyout,
}: Props) => {
  const metadata = useWatch<FormValues, 'metadata'>({ name: 'metadata' });
  const routingTags = metadata?.routingTags;
  const queryClient = useQueryClient();
  const [isCreateFlyoutOpen, setIsCreateFlyoutOpen] = useState(false);

  const { isLoading, error, items } = useMatchedActionPolicies({ http, routingTags });

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
        <p>{actionPoliciesDescription}</p>
      </EuiText>
      <EuiSpacer size="m" />
      <RoutingTagsField />
      <EuiSpacer size="m" />

      <EuiPanel color="subdued" hasShadow={false} paddingSize="m">
        <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiTitle size="xxs">
                  <h4>{appliedPoliciesTitle}</h4>
                </EuiTitle>
              </EuiFlexItem>
              {!isLoading && !error && (
                <EuiFlexItem grow={false}>
                  <EuiBadge color="hollow" data-test-subj="linkedActionPoliciesCount">
                    {items.length}
                  </EuiBadge>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          </EuiFlexItem>
          {CreateActionPolicyFormFlyout && (
            <EuiFlexItem grow={false}>
              <EuiToolTip content={createActionPolicyDisabledReason} position="top">
                <EuiButtonEmpty
                  size="s"
                  flush="right"
                  onClick={() => setIsCreateFlyoutOpen(true)}
                  isDisabled={Boolean(createActionPolicyDisabledReason)}
                  hasAriaDisabled
                  data-test-subj="linkedActionPoliciesCreateLink"
                >
                  {createActionPolicyLabel}
                </EuiButtonEmpty>
              </EuiToolTip>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
        <EuiSpacer size="s" />

        {isLoading && <EuiLoadingSpinner size="m" data-test-subj="linkedActionPoliciesLoading" />}

        {error && (
          <KbnDangerCallout
            announceOnMount
            title={errorTitle}
            data-test-subj="linkedActionPoliciesError"
            text={error.message}
          />
        )}

        {!isLoading && !error && items.length === 0 && (
          <EuiText
            size="s"
            color="subdued"
            textAlign="center"
            data-test-subj="linkedActionPoliciesEmpty"
          >
            <p>{emptyStateLabel}</p>
          </EuiText>
        )}

        {!isLoading && !error && items.length > 0 && (
          <EuiSplitPanel.Outer
            hasBorder
            hasShadow={false}
            data-test-subj="linkedActionPoliciesList"
          >
            {items.map(({ action_policy: actionPolicy, category }, index) => {
              const editLabel = getEditLabel(actionPolicy.name);
              const connectorTypes = connectorTypesByPolicy.get(actionPolicy.id) ?? [];
              return (
                <Fragment key={actionPolicy.id}>
                  {index > 0 && <EuiHorizontalRule margin="none" />}
                  <EuiSplitPanel.Inner
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
                          routingTags={routingTags ?? []}
                        />
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiSplitPanel.Inner>
                </Fragment>
              );
            })}
          </EuiSplitPanel.Outer>
        )}
      </EuiPanel>

      {CreateActionPolicyFormFlyout && isCreateFlyoutOpen && (
        <CreateActionPolicyFormFlyout
          onClose={() => setIsCreateFlyoutOpen(false)}
          onSuccess={() => {
            setIsCreateFlyoutOpen(false);
            queryClient.invalidateQueries({ queryKey: matchedActionPoliciesQueryKey });
          }}
        />
      )}
    </>
  );
};
