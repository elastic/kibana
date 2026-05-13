/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiAccordion,
  EuiBadge,
  EuiButtonEmpty,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import type { RuleResponse } from '@kbn/alerting-v2-schemas';
import * as i18n from './translations';

export interface AlertEpisodeRuleOverviewPanelProps {
  rule: RuleResponse;
  collapsible: boolean;
  getRuleDetailsHref: (ruleId: string) => string;
}

export const AlertEpisodeRuleOverviewPanel = ({
  rule,
  collapsible,
  getRuleDetailsHref,
}: AlertEpisodeRuleOverviewPanelProps) => {
  const ruleKindLabel =
    rule.kind === 'signal' ? i18n.RULE_OVERVIEW_KIND_SIGNAL : i18n.RULE_OVERVIEW_KIND_ALERTING;

  const titleNode = (
    <EuiTitle size="xs">
      <h3 data-test-subj="alertingV2EpisodeDetailsRuleOverviewHeading">
        {i18n.RULE_OVERVIEW_TITLE}
      </h3>
    </EuiTitle>
  );

  const viewDetailsButton = (
    <EuiButtonEmpty
      size="xs"
      color="text"
      iconType="eye"
      href={getRuleDetailsHref(rule.id)}
      data-test-subj="alertingV2EpisodeDetailsViewRuleDetailsButton"
    >
      {i18n.RULE_OVERVIEW_VIEW_DETAILS}
    </EuiButtonEmpty>
  );

  const bodyInner = (
    <>
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiText size="s">
            <strong>{rule.metadata.name}</strong>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            |
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiIcon type="bell" size="s" aria-hidden />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued">
                {ruleKindLabel}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            |
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiBadge
            color={rule.enabled ? 'success' : 'default'}
            data-test-subj="alertingV2EpisodeDetailsRuleStatusBadge"
          >
            {rule.enabled ? i18n.RULE_OVERVIEW_ENABLED : i18n.RULE_OVERVIEW_DISABLED}
          </EuiBadge>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <EuiCodeBlock
        language="esql"
        fontSize="s"
        paddingSize="s"
        isCopyable
        overflowHeight={240}
        data-test-subj="alertingV2EpisodeDetailsRuleQueryCodeBlock"
      >
        {rule.evaluation.query.base}
      </EuiCodeBlock>
    </>
  );

  if (!collapsible) {
    return (
      <>
        <EuiFlexGroup
          alignItems="center"
          justifyContent="spaceBetween"
          responsive={false}
          gutterSize="s"
        >
          <EuiFlexItem grow={false}>{titleNode}</EuiFlexItem>
          <EuiFlexItem grow={false}>{viewDetailsButton}</EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="m" />
        <EuiPanel
          hasBorder
          paddingSize="m"
          data-test-subj="alertingV2EpisodeDetailsRuleOverviewPanel"
        >
          {bodyInner}
        </EuiPanel>
      </>
    );
  }

  return (
    <EuiAccordion
      id="alertingV2EpisodeDetailsRuleOverviewAccordion"
      data-test-subj="alertingV2EpisodeDetailsRuleOverviewAccordion"
      buttonContent={titleNode}
      extraAction={viewDetailsButton}
      paddingSize="none"
      initialIsOpen
    >
      <EuiSpacer size="s" />
      {bodyInner}
    </EuiAccordion>
  );
};
