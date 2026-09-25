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
  type EuiFlyoutProps,
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
import { useRerenderWhenSnoozeExpires } from './use_rerender_when_snooze_expires';

/** Max matched policies rendered in the artifacts card before a "show more" control. */
export const LINKED_ACTION_POLICIES_VISIBLE_LIMIT = 8;

/** Visible policy name length, in graphemes, before the label is cut with an ellipsis. */
const ACTION_POLICY_NAME_CHARACTER_LIMIT = 28;

const graphemeSegmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });

const truncateActionPolicyName = (name: string): string => {
  // Each grapheme is at least one UTF-16 code unit, so a short string cannot need a cut.
  if (name.length <= ACTION_POLICY_NAME_CHARACTER_LIMIT) {
    return name;
  }

  const graphemes: string[] = [];
  for (const { segment } of graphemeSegmenter.segment(name)) {
    graphemes.push(segment);
    if (graphemes.length > ACTION_POLICY_NAME_CHARACTER_LIMIT) {
      break;
    }
  }

  if (graphemes.length <= ACTION_POLICY_NAME_CHARACTER_LIMIT) {
    return name;
  }

  return `${graphemes.slice(0, ACTION_POLICY_NAME_CHARACTER_LIMIT).join('').trimEnd()}...`;
};

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

const ActionPoliciesOpenLink = ({ openHref }: { openHref: string }) => (
  <EuiText size="xs">
    <EuiLink
      color="text"
      href={openHref}
      target="_blank"
      rel="noopener noreferrer"
      external={true}
      css={{ fontWeight: 'normal', whiteSpace: 'nowrap' }}
      data-test-subj="ruleActionPoliciesArtifactsOpenLink"
    >
      {openLinkLabel}
    </EuiLink>
  </EuiText>
);

const ActionPoliciesSubsectionHeader = ({
  openHref,
  showTitle,
}: {
  openHref: string;
  showTitle: boolean;
}) => (
  <EuiFlexGroup
    alignItems="center"
    justifyContent={showTitle ? 'spaceBetween' : 'flexEnd'}
    responsive={false}
  >
    {showTitle ? (
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
    ) : null}
    <EuiFlexItem grow={false}>
      <ActionPoliciesOpenLink openHref={openHref} />
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
  const visibleName = truncateActionPolicyName(actionPolicy.name);
  const nameLink = (
    <EuiLink
      onClick={() => onOpen(actionPolicy.id)}
      aria-label={viewAriaLabel}
      css={{ whiteSpace: 'nowrap' }}
      data-test-subj={`ruleActionPolicyArtifactName-${actionPolicy.id}`}
    >
      {visibleName}
    </EuiLink>
  );

  return (
    <EuiPanel
      hasBorder
      paddingSize="s"
      css={{ minWidth: 0 }}
      data-test-subj={`ruleActionPolicyArtifactRow-${actionPolicy.id}`}
    >
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} css={{ minWidth: 0 }}>
        <EuiFlexItem grow={false}>
          {visibleName === actionPolicy.name ? (
            nameLink
          ) : (
            <EuiToolTip content={actionPolicy.name} disableScreenReaderOutput>
              {nameLink}
            </EuiToolTip>
          )}
        </EuiFlexItem>
        <EuiFlexItem grow>
          <WorkflowConnectorIcons
            types={connectorTypes}
            data-test-subj={`ruleActionPolicyArtifactConnectors-${actionPolicy.id}`}
          />
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
  isExpanded,
  onExpand,
  ruleTags,
  connectorTypesByPolicy,
  onOpen,
}: {
  items: MatchedActionPolicy[];
  evaluatedCount: number;
  isMatchTruncated: boolean;
  isLoading: boolean;
  isError: boolean;
  isExpanded: boolean;
  onExpand: () => void;
  ruleTags: string[];
  connectorTypesByPolicy: Map<string, string[]>;
  onOpen: (policyId: string) => void;
}) => {
  useRerenderWhenSnoozeExpires(items);

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
          icon={<EuiIcon type="tablePlay" size="l" aria-hidden={true} />}
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
            <EuiLink onClick={onExpand} data-test-subj="ruleActionPoliciesArtifactsViewMoreLink">
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

type ActionPoliciesArtifactsSubsectionProps = RuleSummarySectionProps & {
  /** `inherit` when this card is already inside a managed flyout. */
  flyoutSession?: EuiFlyoutProps['session'];
  /** Hide the card title when a parent heading already names this section. */
  showTitle?: boolean;
};

export const ActionPoliciesArtifactsSubsection: React.FC<
  ActionPoliciesArtifactsSubsectionProps
> = ({ rule, flyoutSession = 'start', showTitle = true }) => {
  const { actionPolicyLocators } = useAlertingLocators();
  const ruleTags = rule.metadata.tags ?? [];
  const { items, evaluatedCount, isMatchTruncated, isLoading, isError } =
    useLinkedActionPolicies(ruleTags);
  const [isListExpanded, setIsListExpanded] = useState(false);
  // Connector icons are only rendered for rows on screen. Hidden matches stay
  // out of mgetWorkflows until the operator expands the list.
  const visibleItems = useMemo(() => {
    if (isLoading || isError) {
      return [];
    }
    return isListExpanded ? items : items.slice(0, LINKED_ACTION_POLICIES_VISIBLE_LIMIT);
  }, [isError, isListExpanded, isLoading, items]);
  const visiblePolicies = useMemo(
    () => visibleItems.map((item) => item.action_policy),
    [visibleItems]
  );
  const { connectorTypesByPolicy } = useActionPolicyConnectorTypes(visiblePolicies);
  const [policyToViewId, setPolicyToViewId] = useState<string | null>(null);

  const handleExpandList = useCallback(() => {
    setIsListExpanded(true);
  }, []);

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
        <ActionPoliciesSubsectionHeader openHref={openActionPoliciesHref} showTitle={showTitle} />
        <EuiSpacer size="m" />
        <ArtifactsSubsectionBody
          items={items}
          evaluatedCount={evaluatedCount}
          isMatchTruncated={isMatchTruncated}
          isLoading={isLoading}
          isError={isError}
          isExpanded={isListExpanded}
          onExpand={handleExpandList}
          ruleTags={ruleTags}
          connectorTypesByPolicy={connectorTypesByPolicy}
          onOpen={setPolicyToViewId}
        />
      </EuiPanel>

      {policyToViewId ? (
        <ActionPolicyDetailsFlyoutContainer
          policyId={policyToViewId}
          onClose={handleCloseFlyout}
          session={flyoutSession}
        />
      ) : null}
    </>
  );
};
