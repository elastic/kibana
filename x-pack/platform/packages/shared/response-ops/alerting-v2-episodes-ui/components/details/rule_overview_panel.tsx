/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBadge,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import { RULE_KIND_ICONS, RULE_KIND_LABELS, RULE_KIND_TOOLTIPS } from '@kbn/alerting-v2-constants';
import { getBreachEsqlQuery, type RuleResponse } from '@kbn/alerting-v2-schemas';
import { getPanelTextSize, getPanelTitleSize } from './panel_title_sizes';
import * as i18n from './translations';

export interface AlertEpisodeRuleOverviewPanelProps {
  rule: RuleResponse;
  ruleDetailsHref: string;
  /**
   * Renders the "Rule overview" heading above the panel. The flyout turns it off
   * because its own accordion already titles the section.
   */
  showTitle?: boolean;
  /** Renders the rule name and link one step smaller, for narrow hosts like the details flyout. */
  compressed?: boolean;
}

export const AlertEpisodeRuleOverviewPanel = ({
  rule,
  ruleDetailsHref,
  showTitle = true,
  compressed,
}: AlertEpisodeRuleOverviewPanelProps) => {
  const ruleKindLabel = RULE_KIND_LABELS[rule.kind] ?? rule.kind;
  const textSize = getPanelTextSize(compressed);

  const viewDetailsLink = (
    <EuiText size={textSize}>
      <EuiLink
        href={ruleDetailsHref}
        external
        data-test-subj="alertingV2EpisodeDetailsViewRuleDetailsButton"
      >
        {i18n.RULE_OVERVIEW_VIEW_DETAILS}
      </EuiLink>
    </EuiText>
  );

  const bodyInner = (
    <>
      {/* Outer row does not wrap, so the link stays put. The name and badges wrap inside. */}
      <EuiFlexGroup alignItems="flexStart" gutterSize="s" responsive={false}>
        <EuiFlexItem>
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} wrap>
            <EuiFlexItem grow={false}>
              <EuiText size={textSize}>
                <strong>{rule.metadata.name}</strong>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiToolTip content={RULE_KIND_TOOLTIPS[rule.kind] ?? ''}>
                <EuiBadge
                  color="hollow"
                  iconType={RULE_KIND_ICONS[rule.kind] ?? 'dot'}
                  iconSide="left"
                  tabIndex={0}
                  data-test-subj="alertingV2EpisodeDetailsRuleKindBadge"
                >
                  {ruleKindLabel}
                </EuiBadge>
              </EuiToolTip>
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
        </EuiFlexItem>
        <EuiFlexItem grow={false}>{viewDetailsLink}</EuiFlexItem>
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
        {getBreachEsqlQuery(rule.query)}
      </EuiCodeBlock>
    </>
  );

  return (
    <>
      {showTitle && (
        <>
          <EuiTitle size={getPanelTitleSize(compressed)}>
            <h3 data-test-subj="alertingV2EpisodeDetailsRuleOverviewHeading">
              {i18n.RULE_OVERVIEW_TITLE}
            </h3>
          </EuiTitle>
          <EuiSpacer size="m" />
        </>
      )}
      <EuiPanel
        hasBorder
        paddingSize="m"
        data-test-subj="alertingV2EpisodeDetailsRuleOverviewPanel"
      >
        {bodyInner}
      </EuiPanel>
    </>
  );
};
