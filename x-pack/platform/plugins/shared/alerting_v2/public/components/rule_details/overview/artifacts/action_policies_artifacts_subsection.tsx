/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { EuiPanel, EuiSpacer, type EuiFlyoutProps } from '@elastic/eui';
import { useActionPolicyConnectorTypes } from '@kbn/alerting-v2-rule-form';
import { useAlertingLocators } from '../../../../application/locator_context';
import { ActionPolicyDetailsFlyoutContainer } from '../../../action_policy/details_flyout/action_policy_details_flyout_container';
import type { RuleSummarySectionProps } from '../../../rule/types';
import {
  ActionPoliciesArtifactsBody,
  ActionPoliciesSubsectionHeader,
  LINKED_ACTION_POLICIES_VISIBLE_LIMIT,
} from './action_policies_artifacts_body';
import { useLinkedActionPolicies } from './use_linked_action_policies';

export { LINKED_ACTION_POLICIES_VISIBLE_LIMIT };

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
        <ActionPoliciesArtifactsBody
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
