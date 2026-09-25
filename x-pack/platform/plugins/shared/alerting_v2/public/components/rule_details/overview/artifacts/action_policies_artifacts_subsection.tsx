/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiBadge,
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
import type { MatchedActionPolicy } from '@kbn/alerting-v2-schemas';
import {
  MatchedPolicyReason,
  useActionPolicyConnectorTypes,
  WorkflowConnectorIcons,
} from '@kbn/alerting-v2-rule-form';
import { i18n } from '@kbn/i18n';
import { FormattedDate, FormattedMessage } from '@kbn/i18n-react';
import { useAlertingLocators } from '../../../../application/locator_context';
import { ActionPolicyDetailsFlyoutContainer } from '../../../action_policy/details_flyout/action_policy_details_flyout_container';
import { isSnoozed } from '../../../action_policy/is_snoozed';
import type { RuleSummarySectionProps } from '../../../rule/types';
import { useLinkedActionPolicies } from './use_linked_action_policies';

/** Max matched policies rendered in the artifacts card before a "show more" control. */
export const LINKED_ACTION_POLICIES_VISIBLE_LIMIT = 8;

const openLinkLabel = i18n.translate(
  'xpack.alertingV2.ruleDetails.artifacts.actionPolicies.openLink',
  { defaultMessage: 'Open action policies' }
);

const snoozedBadgeLabel = i18n.translate(
  'xpack.alertingV2.ruleDetails.artifacts.actionPolicies.snoozedBadgeLabel',
  { defaultMessage: 'Snoozed' }
);

const disabledBadgeLabel = i18n.translate(
  'xpack.alertingV2.ruleDetails.artifacts.actionPolicies.disabledBadgeLabel',
  { defaultMessage: 'Disabled' }
);

const tooltipAnchorProps = { css: { display: 'flex' } };

const ActionPoliciesSubsectionHeader = ({ openHref }: { openHref: string }) => (
  <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" responsive={false}>
    <EuiFlexItem grow={false}>
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiIcon type="tablePlay" size="m" aria-hidden={true} />
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
          css={{ fontWeight: 'normal', whiteSpace: 'nowrap' }}
          data-test-subj="ruleActionPoliciesArtifactsOpenLink"
        >
          {openLinkLabel}
        </EuiLink>
      </EuiText>
    </EuiFlexItem>
  </EuiFlexGroup>
);

const PolicyArtifactRow = ({
  item,
  ruleTags,
  connectorTypes,
  onOpen,
}: {
  item: MatchedActionPolicy;
  ruleTags: string[];
  connectorTypes: string[];
  onOpen: (policyId: string) => void;
}) => {
  const { action_policy: actionPolicy, category } = item;
  const viewAriaLabel = i18n.translate(
    'xpack.alertingV2.ruleDetails.artifacts.actionPolicies.viewPolicyAriaLabel',
    { defaultMessage: 'View details for {name}', values: { name: actionPolicy.name } }
  );

  return (
    <EuiPanel
      hasBorder
      paddingSize="s"
      css={{ minWidth: 0 }}
      data-test-subj={`ruleActionPolicyArtifactRow-${actionPolicy.id}`}
    >
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} css={{ minWidth: 0 }}>
        <EuiFlexItem grow css={{ minWidth: 0 }}>
          <EuiFlexGroup
            alignItems="center"
            gutterSize="s"
            responsive={false}
            css={{ minWidth: 0, width: '100%' }}
          >
            <EuiFlexItem grow css={{ minWidth: 0 }}>
              <EuiToolTip
                content={actionPolicy.name}
                disableScreenReaderOutput
                anchorProps={{ css: { display: 'block', minWidth: 0, overflow: 'hidden' } }}
              >
                <EuiLink
                  onClick={() => onOpen(actionPolicy.id)}
                  aria-label={viewAriaLabel}
                  css={{
                    display: 'block',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                  data-test-subj={`ruleActionPolicyArtifactName-${actionPolicy.id}`}
                >
                  {actionPolicy.name}
                </EuiLink>
              </EuiToolTip>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <WorkflowConnectorIcons
                types={connectorTypes}
                data-test-subj={`ruleActionPolicyArtifactConnectors-${actionPolicy.id}`}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false} wrap>
            {!actionPolicy.enabled ? (
              <EuiFlexItem grow={false}>
                <EuiBadge
                  color="default"
                  data-test-subj={`ruleActionPolicyArtifactDisabledBadge-${actionPolicy.id}`}
                >
                  {disabledBadgeLabel}
                </EuiBadge>
              </EuiFlexItem>
            ) : null}
            {isSnoozed(actionPolicy.snoozed_until) ? (
              <EuiFlexItem grow={false}>
                <EuiToolTip
                  anchorProps={tooltipAnchorProps}
                  content={
                    <FormattedMessage
                      id="xpack.alertingV2.ruleDetails.artifacts.actionPolicies.snoozedUntilTooltip"
                      defaultMessage="Notifications snoozed until {expiry}."
                      values={{
                        expiry: (
                          <FormattedDate
                            value={new Date(actionPolicy.snoozed_until)}
                            year="numeric"
                            month="short"
                            day="numeric"
                            hour="numeric"
                            minute="2-digit"
                          />
                        ),
                      }}
                    />
                  }
                >
                  <EuiBadge
                    color="hollow"
                    iconType="bellSlash"
                    tabIndex={0}
                    aria-label={snoozedBadgeLabel}
                    data-test-subj={`ruleActionPolicyArtifactSnoozedBadge-${actionPolicy.id}`}
                  />
                </EuiToolTip>
              </EuiFlexItem>
            ) : null}
            <EuiFlexItem grow={false}>
              <MatchedPolicyReason
                category={category}
                matcher={actionPolicy.matcher}
                ruleTags={ruleTags}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};

const TruncatedMatchHint = ({
  isMatchTruncated,
  evaluatedCount,
}: {
  isMatchTruncated: boolean;
  evaluatedCount: number;
}) => {
  if (!isMatchTruncated) {
    return null;
  }

  return (
    <>
      <EuiSpacer size="s" />
      <EuiText size="s" color="subdued" data-test-subj="ruleActionPoliciesArtifactsTruncatedHint">
        {i18n.translate(
          'xpack.alertingV2.ruleDetails.artifacts.actionPolicies.truncatedCountHint',
          {
            defaultMessage:
              'Only {evaluatedCount, plural, one {# action policy was} other {# action policies were}} evaluated, so this list may be incomplete.',
            values: { evaluatedCount },
          }
        )}
      </EuiText>
    </>
  );
};

const ArtifactsSubsectionBody = ({
  items,
  evaluatedCount,
  isMatchTruncated,
  isLoading,
  isError,
  ruleTags,
  connectorTypesByPolicy,
  onOpen,
}: {
  items: MatchedActionPolicy[];
  evaluatedCount: number;
  isMatchTruncated: boolean;
  isLoading: boolean;
  isError: boolean;
  ruleTags: string[];
  connectorTypesByPolicy: Map<string, string[]>;
  onOpen: (policyId: string) => void;
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (isLoading) {
    return <EuiLoadingSpinner size="m" data-test-subj="ruleActionPoliciesArtifactsLoading" />;
  }

  if (isError) {
    return (
      <EuiEmptyPrompt
        color="danger"
        icon={<EuiIcon type="warning" size="l" aria-hidden={true} />}
        titleSize="xs"
        paddingSize="m"
        data-test-subj="ruleActionPoliciesArtifactsError"
        title={
          <h4>
            {i18n.translate('xpack.alertingV2.ruleDetails.artifacts.actionPolicies.errorTitle', {
              defaultMessage: 'Could not load action policies',
            })}
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
    );
  }

  if (items.length === 0) {
    return (
      <>
        <EuiEmptyPrompt
          icon={<EuiIcon type="reporter" size="l" aria-hidden={true} />}
          titleSize="xs"
          paddingSize="m"
          data-test-subj="ruleActionPoliciesArtifactsEmpty"
          title={
            <h4>
              {i18n.translate('xpack.alertingV2.ruleDetails.artifacts.actionPolicies.emptyTitle', {
                defaultMessage: 'No matching action policies',
              })}
            </h4>
          }
          body={
            <EuiText size="s">
              {i18n.translate(
                'xpack.alertingV2.ruleDetails.artifacts.actionPolicies.emptyDescription',
                {
                  defaultMessage: 'No action policies currently match this rule.',
                }
              )}
            </EuiText>
          }
        />
        <TruncatedMatchHint isMatchTruncated={isMatchTruncated} evaluatedCount={evaluatedCount} />
      </>
    );
  }

  const visibleItems = isExpanded ? items : items.slice(0, LINKED_ACTION_POLICIES_VISIBLE_LIMIT);
  const hiddenCount = items.length - visibleItems.length;

  return (
    <>
      <EuiFlexGroup direction="column" gutterSize="s" responsive={false}>
        {visibleItems.map((item) => (
          <EuiFlexItem grow={false} key={item.action_policy.id}>
            <PolicyArtifactRow
              item={item}
              ruleTags={ruleTags}
              connectorTypes={connectorTypesByPolicy.get(item.action_policy.id) ?? []}
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
              onClick={() => setIsExpanded(true)}
              data-test-subj="ruleActionPoliciesArtifactsViewMoreLink"
            >
              {i18n.translate(
                'xpack.alertingV2.ruleDetails.artifacts.actionPolicies.viewMoreLinkText',
                {
                  defaultMessage:
                    '{hiddenCount, plural, one {# more action policy} other {# more action policies}}',
                  values: { hiddenCount },
                }
              )}
            </EuiLink>
          </EuiText>
        </>
      ) : null}

      <TruncatedMatchHint isMatchTruncated={isMatchTruncated} evaluatedCount={evaluatedCount} />
    </>
  );
};

export const ActionPoliciesArtifactsSubsection: React.FC<RuleSummarySectionProps> = ({ rule }) => {
  const { actionPolicyLocators } = useAlertingLocators();
  const ruleTags = rule.metadata.tags ?? [];
  const { items, evaluatedCount, isMatchTruncated, isLoading, isError } =
    useLinkedActionPolicies(ruleTags);
  const policies = useMemo(() => items.map((item) => item.action_policy), [items]);
  const { connectorTypesByPolicy } = useActionPolicyConnectorTypes(policies);
  const [policyToViewId, setPolicyToViewId] = useState<string | null>(null);

  const openActionPoliciesHref = actionPolicyLocators.useUrl({ page: 'list' });

  const handleCloseFlyout = useCallback(() => {
    setPolicyToViewId(null);
  }, []);

  return (
    <>
      <EuiPanel
        hasBorder
        paddingSize="m"
        css={{ minWidth: 0 }}
        data-test-subj="ruleActionPoliciesArtifactsSection"
      >
        <ActionPoliciesSubsectionHeader openHref={openActionPoliciesHref} />
        <EuiSpacer size="m" />
        <ArtifactsSubsectionBody
          items={items}
          evaluatedCount={evaluatedCount}
          isMatchTruncated={isMatchTruncated}
          isLoading={isLoading}
          isError={isError}
          ruleTags={ruleTags}
          connectorTypesByPolicy={connectorTypesByPolicy}
          onOpen={setPolicyToViewId}
        />
      </EuiPanel>

      {policyToViewId ? (
        <ActionPolicyDetailsFlyoutContainer policyId={policyToViewId} onClose={handleCloseFlyout} />
      ) : null}
    </>
  );
};
