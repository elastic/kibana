/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiIconTip,
  EuiLink,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  EuiStat,
  EuiText,
} from '@elastic/eui';
import { CoreStart, useService } from '@kbn/core-di-browser';
import type { ActionPolicyResponse } from '@kbn/alerting-v2-schemas';
import { i18n } from '@kbn/i18n';
import { ActionPolicyDestinationsSummary } from '../../../action_policy/action_policy_destinations_summary';
import { ActionPolicyDetailsFlyoutContainer } from '../../../action_policy/details_flyout/action_policy_details_flyout_container';
import { ActionPolicyStateBadge } from '../../../action_policy/action_policy_state_badge';
import { isSnoozed } from '../../../action_policy/is_snoozed';
import { paths } from '../../../../constants';
import { useRule } from '../../rule_context';
import { useLinkedActionPolicies } from './use_linked_action_policies';

const LinkedActionPolicyStatusBadge = ({ policy }: { policy: ActionPolicyResponse }) => {
  if (!policy.enabled) {
    return <ActionPolicyStateBadge policy={policy} isLoading={false} />;
  }

  if (isSnoozed(policy.snoozedUntil)) {
    return (
      <EuiBadge color="hollow" iconType="bellSlash">
        {i18n.translate('xpack.alertingV2.ruleDetails.artifacts.actionPolicies.statusSnoozed', {
          defaultMessage: 'Snoozed',
        })}
      </EuiBadge>
    );
  }

  return <ActionPolicyStateBadge policy={policy} isLoading={false} />;
};

const ActionPolicyRow = ({
  policy,
  onViewPolicy,
}: {
  policy: ActionPolicyResponse;
  onViewPolicy: (policyId: string) => void;
}) => (
  <EuiPanel hasBorder paddingSize="s" data-test-subj={`ruleActionPolicyArtifactRow-${policy.id}`}>
    <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
      <EuiFlexItem grow={2}>
        <EuiLink
          onClick={() => onViewPolicy(policy.id)}
          data-test-subj={`ruleActionPolicyArtifactName-${policy.id}`}
        >
          {policy.name}
        </EuiLink>
      </EuiFlexItem>
      <EuiFlexItem grow={2}>
        <ActionPolicyDestinationsSummary destinations={policy.destinations} />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <span data-test-subj={`ruleActionPolicyArtifactStatus-${policy.id}`}>
          <LinkedActionPolicyStatusBadge policy={policy} />
        </span>
      </EuiFlexItem>
    </EuiFlexGroup>
  </EuiPanel>
);

const ActionPoliciesSubsectionHeader = () => (
  <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" responsive={false}>
    <EuiFlexItem grow={false}>
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiIcon type="bell" size="m" aria-hidden={true} />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="s">
            <strong>
              {i18n.translate('xpack.alertingV2.ruleDetails.artifacts.actionPolicies.title', {
                defaultMessage: 'Action policies',
              })}
            </strong>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <span data-test-subj="ruleActionPoliciesArtifactsHelp">
            <EuiIconTip
              type="questionInCircle"
              color="subdued"
              content={i18n.translate(
                'xpack.alertingV2.ruleDetails.artifacts.actionPolicies.helpTooltip',
                {
                  defaultMessage:
                    "Only action policies whose matcher explicitly filters on this rule's ID are shown. Policies that might match based on tags or other fields are not included.",
                }
              )}
            />
          </span>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiButtonIcon
        iconType="boxesHorizontal"
        color="text"
        aria-label={i18n.translate(
          'xpack.alertingV2.ruleDetails.artifacts.actionPolicies.overflowMenuAriaLabel',
          { defaultMessage: 'Action policies section menu' }
        )}
        data-test-subj="ruleActionPoliciesArtifactsOverflowButton"
      />
    </EuiFlexItem>
  </EuiFlexGroup>
);

export const ActionPoliciesArtifactsSubsection: React.FC = () => {
  const rule = useRule();
  const http = useService(CoreStart('http'));
  const { policies, totalCount, catchAllCount, matchingCriteriaCount, isLoading, isError } =
    useLinkedActionPolicies(rule.id);
  const [policyToViewId, setPolicyToViewId] = useState<string | null>(null);

  const manageActionPoliciesHref = useMemo(
    () => http.basePath.prepend(paths.actionPolicyList),
    [http.basePath]
  );

  const summaryText = useMemo(() => {
    if (totalCount === 0) {
      return null;
    }

    return i18n.translate('xpack.alertingV2.ruleDetails.artifacts.actionPolicies.summary', {
      defaultMessage:
        '{matchingCriteriaCount, plural, one {# is matching criteria} other {# are matching criteria}} and {catchAllCount, plural, one {# is catch-all} other {# are catch-all}}',
      values: { matchingCriteriaCount, catchAllCount },
    });
  }, [catchAllCount, matchingCriteriaCount, totalCount]);

  return (
    <>
      <EuiPanel hasBorder paddingSize="m" data-test-subj="ruleActionPoliciesArtifactsSection">
        <ActionPoliciesSubsectionHeader />
        <EuiSpacer size="s" />
        <EuiButtonEmpty
          size="s"
          iconType="popout"
          iconSide="right"
          href={manageActionPoliciesHref}
          data-test-subj="ruleActionPoliciesArtifactsManageLink"
        >
          {i18n.translate('xpack.alertingV2.ruleDetails.artifacts.actionPolicies.manageLink', {
            defaultMessage: 'Manage action policies',
          })}
        </EuiButtonEmpty>
        <EuiSpacer size="m" />

        <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiStat
              title={totalCount}
              description={i18n.translate(
                'xpack.alertingV2.ruleDetails.artifacts.actionPolicies.statDescription',
                { defaultMessage: 'Action policies' }
              )}
              titleSize="l"
              textAlign="left"
              reverse
              isLoading={isLoading}
              data-test-subj="ruleActionPoliciesArtifactsStat"
            />
          </EuiFlexItem>
          {summaryText ? (
            <EuiFlexItem grow>
              <EuiText size="s" color="subdued" data-test-subj="ruleActionPoliciesArtifactsSummary">
                {summaryText}
              </EuiText>
            </EuiFlexItem>
          ) : null}
        </EuiFlexGroup>

        <EuiSpacer size="m" />

        {isLoading ? (
          <EuiLoadingSpinner size="m" data-test-subj="ruleActionPoliciesArtifactsLoading" />
        ) : null}

        {!isLoading && isError ? (
          <EuiEmptyPrompt
            color="danger"
            iconType="warning"
            data-test-subj="ruleActionPoliciesArtifactsError"
            title={
              <h4>
                {i18n.translate(
                  'xpack.alertingV2.ruleDetails.artifacts.actionPolicies.errorTitle',
                  {
                    defaultMessage: 'Could not load action policies',
                  }
                )}
              </h4>
            }
            body={
              <EuiText size="s">
                {i18n.translate('xpack.alertingV2.ruleDetails.artifacts.actionPolicies.errorBody', {
                  defaultMessage: 'Try refreshing the page.',
                })}
              </EuiText>
            }
          />
        ) : null}

        {!isLoading && !isError && totalCount === 0 ? (
          <EuiEmptyPrompt
            iconType="bell"
            data-test-subj="ruleActionPoliciesArtifactsEmpty"
            title={
              <h4>
                {i18n.translate(
                  'xpack.alertingV2.ruleDetails.artifacts.actionPolicies.emptyTitle',
                  {
                    defaultMessage: 'No action policies linked to this rule',
                  }
                )}
              </h4>
            }
            body={
              <EuiText size="s">
                {i18n.translate('xpack.alertingV2.ruleDetails.artifacts.actionPolicies.emptyBody', {
                  defaultMessage:
                    "Create or edit an action policy with a matcher that filters on this rule's ID.",
                })}
              </EuiText>
            }
          />
        ) : null}

        {!isLoading && !isError && policies.length > 0 ? (
          <>
            {policies.map((policy) => (
              <React.Fragment key={policy.id}>
                <ActionPolicyRow policy={policy} onViewPolicy={setPolicyToViewId} />
                <EuiSpacer size="s" />
              </React.Fragment>
            ))}
          </>
        ) : null}
      </EuiPanel>

      {policyToViewId ? (
        <ActionPolicyDetailsFlyoutContainer
          policyId={policyToViewId}
          onClose={() => setPolicyToViewId(null)}
        />
      ) : null}
    </>
  );
};
