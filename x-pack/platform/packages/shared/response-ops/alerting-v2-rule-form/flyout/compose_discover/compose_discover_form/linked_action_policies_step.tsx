/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import type { HttpStart } from '@kbn/core-http-browser';
import { i18n } from '@kbn/i18n';
import { KbnDangerCallout } from '@kbn/ui-callout';
import React from 'react';
import { useWatch } from 'react-hook-form';
import type { FormValues } from '../../../form/types';
import { MatchedPolicyReason } from './matched_policy_reason';
import { useMatchedActionPolicies } from './use_matched_action_policies';

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
  { defaultMessage: 'No matching action policies found.' }
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
}

export const LinkedActionPoliciesStep = ({ http }: Props) => {
  const metadata = useWatch<FormValues, 'metadata'>({ name: 'metadata' });
  const tags = metadata?.tags;

  const { isLoading, error, items } = useMatchedActionPolicies({ http, tags });
  const ruleTags = tags ?? [];

  return (
    <>
      <EuiTitle size="xs">
        <h3>{actionPoliciesTitle}</h3>
      </EuiTitle>
      <EuiSpacer size="xs" />

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
          <EuiText size="s" color="subdued" data-test-subj="linkedActionPoliciesEmpty">
            <p>{emptyStateLabel}</p>
          </EuiText>
        ) : (
          <EuiFlexGroup direction="column" gutterSize="s" data-test-subj="linkedActionPoliciesList">
            <EuiText size="s" color="subdued">
              <p>{matchingSubtext}</p>
            </EuiText>
            {items.map(({ actionPolicy, category }) => {
              const editLabel = getEditLabel(actionPolicy.name);
              return (
                <EuiFlexItem key={actionPolicy.id}>
                  <EuiPanel
                    hasBorder
                    hasShadow={false}
                    paddingSize="s"
                    data-test-subj={`linkedActionPolicyRow-${actionPolicy.id}`}
                  >
                    <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                      <EuiFlexItem>
                        <EuiText size="s">
                          <strong>{actionPolicy.name}</strong>
                        </EuiText>
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <MatchedPolicyReason
                          category={category}
                          matcher={actionPolicy.matcher}
                          ruleTags={ruleTags}
                        />
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiToolTip content={editLabel} disableScreenReaderOutput>
                          <EuiButtonIcon
                            iconType="external"
                            href={http.basePath.prepend(
                              `${ACTION_POLICY_EDIT_BASE}/${encodeURIComponent(actionPolicy.id)}`
                            )}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={editLabel}
                            data-test-subj={`linkedActionPolicyEdit-${actionPolicy.id}`}
                          />
                        </EuiToolTip>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiPanel>
                </EuiFlexItem>
              );
            })}
          </EuiFlexGroup>
        ))}
    </>
  );
};
