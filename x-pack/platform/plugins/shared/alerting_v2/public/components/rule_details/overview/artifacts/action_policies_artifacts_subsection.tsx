/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import {
  EuiBadge,
  EuiButtonIcon,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { CoreStart, useService } from '@kbn/core-di-browser';
import { i18n } from '@kbn/i18n';
import type { ActionPolicyResponse, MatchedActionPolicy } from '@kbn/alerting-v2-schemas';
import { paths } from '../../../../constants';
import { ActionPolicyDetailsFlyoutContainer } from '../../../action_policy/details_flyout/action_policy_details_flyout_container';
import { ActionPolicyStateBadge } from '../../../action_policy/action_policy_state_badge';
import { isSnoozed } from '../../../action_policy/is_snoozed';
import { useRule } from '../../rule_context';
import {
  useLinkedActionPolicies,
  LINKED_ACTION_POLICIES_FETCH_LIMIT,
} from './use_linked_action_policies';

/** Max matched policies rendered in the artifacts card before a "view more" link. */
export const LINKED_ACTION_POLICIES_VISIBLE_LIMIT = 8;

const openLinkLabel = i18n.translate(
  'xpack.alertingV2.ruleDetails.artifacts.notificationPolicies.openLink',
  { defaultMessage: 'Open notification policies' }
);

const catchAllBadgeLabel = i18n.translate(
  'xpack.alertingV2.ruleDetails.artifacts.notificationPolicies.catchAllBadgeLabel',
  { defaultMessage: 'Catch-all' }
);

const matchingCriteriaBadgeLabel = i18n.translate(
  'xpack.alertingV2.ruleDetails.artifacts.notificationPolicies.matchingCriteriaBadgeLabel',
  { defaultMessage: 'Matching criteria' }
);

const snoozedBadgeLabel = i18n.translate(
  'xpack.alertingV2.ruleDetails.artifacts.notificationPolicies.snoozedBadgeLabel',
  { defaultMessage: 'Snoozed' }
);

const ActionPoliciesSubsectionHeader = ({ openHref }: { openHref: string }) => (
  <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" responsive={false}>
    <EuiFlexItem grow={false}>
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
    <EuiFlexItem grow={false}>
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

const PolicyCategoryBadge = ({
  category,
  policyId,
}: {
  category: MatchedActionPolicy['category'];
  policyId: string;
}) => {
  const isCatchAll = category === 'global';
  return (
    <EuiBadge
      color={isCatchAll ? 'hollow' : 'primary'}
      data-test-subj={`ruleActionPolicyArtifactCategory-${policyId}`}
    >
      {isCatchAll ? catchAllBadgeLabel : matchingCriteriaBadgeLabel}
    </EuiBadge>
  );
};

const PolicyRowActions = ({
  policy,
  editHref,
}: {
  policy: ActionPolicyResponse;
  editHref: string;
}) => {
  const editAriaLabel = i18n.translate(
    'xpack.alertingV2.ruleDetails.artifacts.notificationPolicies.editPolicyAriaLabel',
    { defaultMessage: 'Open {name} in notification policies', values: { name: policy.name } }
  );

  return (
    <EuiToolTip content={editAriaLabel} disableScreenReaderOutput>
      <EuiButtonIcon
        iconType="external"
        color="text"
        href={editHref}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={editAriaLabel}
        data-test-subj={`ruleActionPolicyArtifactEditLink-${policy.id}`}
      />
    </EuiToolTip>
  );
};

const PolicyArtifactRow = ({
  item,
  editHref,
  onOpen,
}: {
  item: MatchedActionPolicy;
  editHref: string;
  onOpen: (policyId: string) => void;
}) => {
  const { actionPolicy, category } = item;
  const viewAriaLabel = i18n.translate(
    'xpack.alertingV2.ruleDetails.artifacts.notificationPolicies.viewPolicyAriaLabel',
    { defaultMessage: 'View details for {name}', values: { name: actionPolicy.name } }
  );

  return (
    <EuiPanel
      hasBorder
      paddingSize="s"
      data-test-subj={`ruleActionPolicyArtifactRow-${actionPolicy.id}`}
    >
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow style={{ minWidth: 0 }}>
          <EuiText
            size="s"
            style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
          >
            <EuiLink
              onClick={() => onOpen(actionPolicy.id)}
              aria-label={viewAriaLabel}
              data-test-subj={`ruleActionPolicyArtifactName-${actionPolicy.id}`}
            >
              {actionPolicy.name}
            </EuiLink>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false} wrap>
            <EuiFlexItem grow={false}>
              <PolicyCategoryBadge category={category} policyId={actionPolicy.id} />
            </EuiFlexItem>
            {!actionPolicy.enabled ? (
              <EuiFlexItem
                grow={false}
                data-test-subj={`ruleActionPolicyArtifactDisabledBadge-${actionPolicy.id}`}
              >
                <ActionPolicyStateBadge policy={actionPolicy} isLoading={false} />
              </EuiFlexItem>
            ) : null}
            {isSnoozed(actionPolicy.snoozed_until) ? (
              <EuiFlexItem grow={false}>
                <EuiBadge
                  color="warning"
                  data-test-subj={`ruleActionPolicyArtifactSnoozedBadge-${actionPolicy.id}`}
                >
                  {snoozedBadgeLabel}
                </EuiBadge>
              </EuiFlexItem>
            ) : null}
            <EuiFlexItem grow={false}>
              <PolicyRowActions policy={actionPolicy} editHref={editHref} />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};

const ArtifactsSubsectionBody = ({
  items,
  isMatchTruncated,
  isLoading,
  isError,
  openHref,
  prepend,
  onOpen,
}: {
  items: MatchedActionPolicy[];
  isMatchTruncated: boolean;
  isLoading: boolean;
  isError: boolean;
  openHref: string;
  prepend: (path: string) => string;
  onOpen: (policyId: string) => void;
}) => {
  if (isLoading) {
    return <EuiLoadingSpinner size="m" data-test-subj="ruleActionPoliciesArtifactsLoading" />;
  }

  if (isError) {
    return (
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
    );
  }

  if (items.length === 0) {
    return (
      <EuiEmptyPrompt
        iconType="reporter"
        data-test-subj="ruleActionPoliciesArtifactsEmpty"
        title={
          <h4>
            {i18n.translate(
              'xpack.alertingV2.ruleDetails.artifacts.notificationPolicies.emptyTitle',
              { defaultMessage: 'No matching notification policies' }
            )}
          </h4>
        }
        body={
          <EuiText size="s">
            {i18n.translate(
              'xpack.alertingV2.ruleDetails.artifacts.notificationPolicies.emptyDescription',
              {
                defaultMessage: 'No notification policies currently match this rule.',
              }
            )}
          </EuiText>
        }
      />
    );
  }

  const visibleItems = items.slice(0, LINKED_ACTION_POLICIES_VISIBLE_LIMIT);
  const hiddenCount = items.length - visibleItems.length;

  return (
    <>
      <EuiFlexGroup direction="column" gutterSize="s" responsive={false}>
        {visibleItems.map((item) => (
          <EuiFlexItem grow={false} key={item.actionPolicy.id}>
            <PolicyArtifactRow
              item={item}
              editHref={prepend(paths.actionPolicyEdit(item.actionPolicy.id))}
              onOpen={onOpen}
            />
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>

      {hiddenCount > 0 ? (
        <>
          <EuiSpacer size="s" />
          <EuiText size="s">
            <EuiLink
              href={openHref}
              target="_blank"
              rel="noopener noreferrer"
              data-test-subj="ruleActionPoliciesArtifactsViewMoreLink"
            >
              {i18n.translate(
                'xpack.alertingV2.ruleDetails.artifacts.notificationPolicies.viewMoreLinkText',
                {
                  defaultMessage:
                    '{hiddenCount, plural, one {# more matching policy} other {# more matching policies}}',
                  values: { hiddenCount },
                }
              )}
            </EuiLink>
          </EuiText>
        </>
      ) : null}

      {isMatchTruncated ? (
        <>
          <EuiSpacer size="s" />
          <EuiText
            size="s"
            color="subdued"
            data-test-subj="ruleActionPoliciesArtifactsTruncatedHint"
          >
            {i18n.translate(
              'xpack.alertingV2.ruleDetails.artifacts.notificationPolicies.truncatedCountHint',
              {
                defaultMessage:
                  'This space has more than {fetchLimit} action policies, so this list may be incomplete.',
                values: { fetchLimit: LINKED_ACTION_POLICIES_FETCH_LIMIT },
              }
            )}
          </EuiText>
        </>
      ) : null}
    </>
  );
};

export const ActionPoliciesArtifactsSubsection: React.FC = () => {
  const rule = useRule();
  const http = useService(CoreStart('http'));
  const { items, isMatchTruncated, isLoading, isError } = useLinkedActionPolicies(rule.id);
  const [policyToViewId, setPolicyToViewId] = useState<string | null>(null);

  const openNotificationPoliciesHref = http.basePath.prepend(paths.actionPolicyList);

  const handleOpenPolicy = useCallback((policyId: string) => {
    setPolicyToViewId(policyId);
  }, []);

  const handleCloseFlyout = useCallback(() => {
    setPolicyToViewId(null);
  }, []);

  return (
    <>
      <EuiPanel hasBorder paddingSize="m" data-test-subj="ruleActionPoliciesArtifactsSection">
        <ActionPoliciesSubsectionHeader openHref={openNotificationPoliciesHref} />
        <EuiSpacer size="m" />
        <ArtifactsSubsectionBody
          items={items}
          isMatchTruncated={isMatchTruncated}
          isLoading={isLoading}
          isError={isError}
          openHref={openNotificationPoliciesHref}
          prepend={http.basePath.prepend.bind(http.basePath)}
          onOpen={handleOpenPolicy}
        />
      </EuiPanel>

      {policyToViewId ? (
        <ActionPolicyDetailsFlyoutContainer policyId={policyToViewId} onClose={handleCloseFlyout} />
      ) : null}
    </>
  );
};
