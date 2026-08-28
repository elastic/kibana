/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiStat,
  EuiText,
} from '@elastic/eui';
import { CoreStart, useService } from '@kbn/core-di-browser';
import { i18n } from '@kbn/i18n';
import { paths } from '../../../../constants';
import { useRule } from '../../rule_context';
import {
  useLinkedActionPolicies,
  LINKED_ACTION_POLICIES_FETCH_LIMIT,
} from './use_linked_action_policies';

const openLinkLabel = i18n.translate(
  'xpack.alertingV2.ruleDetails.artifacts.notificationPolicies.openLink',
  { defaultMessage: 'Open notification policies' }
);

const ActionPoliciesSubsectionHeader = ({ openHref }: { openHref: string }) => (
  <EuiFlexGroup alignItems="center" gutterSize="s" wrap responsive={false}>
    <EuiFlexItem grow={false} style={{ minWidth: 0 }}>
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiIcon type="reporter" size="m" aria-hidden={true} />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="s">
            <strong>
              {i18n.translate('xpack.alertingV2.ruleDetails.artifacts.notificationPolicies.title', {
                defaultMessage: 'Notification policies',
              })}
            </strong>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexItem>
    <EuiFlexItem grow={false} style={{ marginLeft: 'auto' }}>
      <EuiText size="xs">
        <EuiLink
          color="text"
          href={openHref}
          target="_blank"
          rel="noopener noreferrer"
          external={false}
          style={{ fontWeight: 'normal', whiteSpace: 'nowrap' }}
          data-test-subj="ruleActionPoliciesArtifactsOpenLink"
        >
          {openLinkLabel}
        </EuiLink>
      </EuiText>
    </EuiFlexItem>
  </EuiFlexGroup>
);

export const ActionPoliciesArtifactsSubsection: React.FC = () => {
  const rule = useRule();
  const http = useService(CoreStart('http'));
  const { totalCount, catchAllCount, matchingCriteriaCount, isCountTruncated, isLoading, isError } =
    useLinkedActionPolicies(rule.id);

  const openNotificationPoliciesHref = http.basePath.prepend(paths.actionPolicyList);

  const statTitle = isCountTruncated ? `${totalCount}+` : totalCount;

  const summaryText =
    totalCount > 0
      ? i18n.translate('xpack.alertingV2.ruleDetails.artifacts.notificationPolicies.summary', {
          defaultMessage:
            '{matchingCriteriaCount, plural, one {# is matching criteria} other {# are matching criteria}} and {catchAllCount, plural, one {# is catch-all} other {# are catch-all}}',
          values: { matchingCriteriaCount, catchAllCount },
        })
      : null;

  const truncatedCountHint = isCountTruncated
    ? i18n.translate(
        'xpack.alertingV2.ruleDetails.artifacts.notificationPolicies.truncatedCountHint',
        {
          defaultMessage:
            'This space has more than {fetchLimit} action policies, so this count may be low.',
          values: { fetchLimit: LINKED_ACTION_POLICIES_FETCH_LIMIT },
        }
      )
    : null;

  const shouldShowCounts = isLoading || !isError;

  return (
    <EuiPanel hasBorder paddingSize="m" data-test-subj="ruleActionPoliciesArtifactsSection">
      <ActionPoliciesSubsectionHeader openHref={openNotificationPoliciesHref} />
      <EuiSpacer size="m" />

      {shouldShowCounts ? (
        <>
          <EuiStat
            title={statTitle}
            description={i18n.translate(
              'xpack.alertingV2.ruleDetails.artifacts.notificationPolicies.statDescription',
              { defaultMessage: 'Notification policies' }
            )}
            titleSize="l"
            textAlign="left"
            reverse
            isLoading={isLoading}
            data-test-subj="ruleActionPoliciesArtifactsStat"
          />

          {summaryText ? (
            <>
              <EuiSpacer size="s" />
              <EuiText size="s" color="subdued" data-test-subj="ruleActionPoliciesArtifactsSummary">
                {summaryText}
              </EuiText>
            </>
          ) : null}

          {truncatedCountHint ? (
            <>
              <EuiSpacer size="s" />
              <EuiText
                size="s"
                color="subdued"
                data-test-subj="ruleActionPoliciesArtifactsTruncatedHint"
              >
                {truncatedCountHint}
              </EuiText>
            </>
          ) : null}
        </>
      ) : null}

      {!isLoading && isError ? (
        <>
          <EuiSpacer size="m" />
          <EuiEmptyPrompt
            color="danger"
            iconType="warning"
            data-test-subj="ruleActionPoliciesArtifactsError"
            title={
              <h4>
                {i18n.translate(
                  'xpack.alertingV2.ruleDetails.artifacts.notificationPolicies.errorTitle',
                  {
                    defaultMessage: 'Could not load notification policies',
                  }
                )}
              </h4>
            }
            body={
              <EuiText size="s">
                {i18n.translate(
                  'xpack.alertingV2.ruleDetails.artifacts.notificationPolicies.errorBody',
                  {
                    defaultMessage: 'Try refreshing the page.',
                  }
                )}
              </EuiText>
            }
          />
        </>
      ) : null}
    </EuiPanel>
  );
};
