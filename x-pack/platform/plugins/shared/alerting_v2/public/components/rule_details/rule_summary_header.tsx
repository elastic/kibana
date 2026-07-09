/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import React from 'react';
import { RULE_KIND_ICONS, RULE_KIND_LABELS, RULE_KIND_TOOLTIPS } from '@kbn/alerting-v2-constants';
import {
  TagsOverflowBadgeRow,
  getTagsOverflowLimits,
} from '@kbn/alerting-v2-episodes-ui/components/actions/tags_overflow_badge_row';
import { useRule } from './rule_context';
import type { RuleApiResponse } from '../../services/rules_api';

// The summary badges row always has 2 non-tag badges: kind and enabled/disabled.
const { overflowSize: TAGS_OVERFLOW_SIZE, maxVisible: TAGS_MAX_VISIBLE_ON_OVERFLOW } =
  getTagsOverflowLimits(2);

/**
 * Rule description text. Renders nothing when the rule has no description.
 */
export const RuleHeaderDescription: React.FC = () => {
  const rule = useRule();
  const { euiTheme } = useEuiTheme();
  const { description } = rule.metadata;

  if (!description) {
    return null;
  }

  return (
    // EuiText has no font-weight prop, so a lighter-than-bold weight for the description
    // has to be set via css instead of a design-token size/color prop.
    <EuiText
      size="s"
      color="subdued"
      css={css`
        font-weight: ${euiTheme.font.weight.medium};
      `}
      data-test-subj="ruleDescription"
    >
      {description}
    </EuiText>
  );
};

/**
 * Rule tags as plain hollow badges. Renders nothing when the rule has no tags.
 *
 * Only used standalone (e.g. the agent builder rule attachment) where tags aren't already shown
 * alongside the kind/status badges — see `RuleTitleWithBadges`'s `'summary'` variant for that.
 */
export const RuleTagsList: React.FC = () => {
  const rule = useRule();
  const { tags } = rule.metadata;

  if (!tags || tags.length === 0) {
    return null;
  }

  return (
    <EuiFlexGroup gutterSize="xs" wrap responsive={false} data-test-subj="ruleTags">
      {tags.map((tag) => (
        <EuiFlexItem key={tag} grow={false}>
          <EuiBadge color="hollow">{tag}</EuiBadge>
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};

export interface RuleKindBadgeProps {
  kind: RuleApiResponse['kind'];
}

/**
 * Hollow badge showing the rule kind, with its icon and a descriptive tooltip.
 * Shared between the inline/summary title and the rule details app header.
 */
// Flex anchor avoids inline line-height missizing (see status_badges.tsx for the same fix).
const tooltipAnchorProps = { css: { display: 'flex' } };

export const RuleKindBadge: React.FC<RuleKindBadgeProps> = ({ kind }) => (
  <EuiToolTip content={RULE_KIND_TOOLTIPS[kind]} anchorProps={tooltipAnchorProps}>
    <EuiBadge
      color="hollow"
      iconType={RULE_KIND_ICONS[kind] ?? 'dot'}
      iconSide="left"
      tabIndex={0}
      data-test-subj="kindBadge"
    >
      {RULE_KIND_LABELS[kind] ?? kind}
    </EuiBadge>
  </EuiToolTip>
);

export interface RuleTitleWithBadgesProps {
  /**
   * `'full'` (default) renders the rule name, kind, and status inline,
   * separated by vertical dividers. `'summary'` stacks the name above a row
   * containing the kind and status badges, designed for the rule summary flyout.
   */
  variant?: 'full' | 'summary';
}

/**
 * Rule name with kind and status. Defaults to the inline `'full'` layout;
 * pass `variant="summary"` to render the name above the badges row.
 */
export const RuleTitleWithBadges: React.FC<RuleTitleWithBadgesProps> = ({ variant = 'full' }) => {
  const rule = useRule();
  const isSummary = variant === 'summary';

  const kindBadge = <RuleKindBadge kind={rule.kind} />;

  const statusBadge = rule.enabled ? (
    <EuiBadge color="success" data-test-subj="enabledBadge">
      {i18n.translate('xpack.alertingV2.ruleDetails.enabled', {
        defaultMessage: 'Enabled',
      })}
    </EuiBadge>
  ) : (
    <EuiBadge color="default" data-test-subj="disabledBadge">
      {i18n.translate('xpack.alertingV2.ruleDetails.disabled', {
        defaultMessage: 'Disabled',
      })}
    </EuiBadge>
  );

  const divider = (
    <EuiText size="s" color="text" aria-hidden={true}>
      |
    </EuiText>
  );

  if (isSummary) {
    const tags = rule.metadata.tags ?? [];

    // Single wrapping row (not a fixed name-row + badges-row split) so the badges naturally
    // drop to a second line only when the name doesn't leave room for them, instead of always
    // reserving a dedicated row for badges even when they'd fit next to the name. The badges
    // are grouped into one flex item (wrap={false} inside) so they jump down together as a
    // unit rather than wrapping individually mid-cluster.
    return (
      <EuiFlexGroup alignItems="center" gutterSize="s" wrap responsive={false}>
        <EuiFlexItem grow={false}>
          <span data-test-subj="ruleName">{rule.metadata.name}</span>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup alignItems="center" gutterSize="s" wrap={false} responsive={false}>
            <EuiFlexItem grow={false}>{kindBadge}</EuiFlexItem>
            <EuiFlexItem grow={false}>{statusBadge}</EuiFlexItem>
            <TagsOverflowBadgeRow
              tags={tags}
              overflowSize={TAGS_OVERFLOW_SIZE}
              maxVisible={TAGS_MAX_VISIBLE_ON_OVERFLOW}
            />
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  return (
    <EuiFlexGroup alignItems="center" gutterSize="m" wrap={false} responsive={false}>
      <EuiFlexItem grow={false}>
        <span data-test-subj="ruleName">{rule.metadata.name}</span>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>{divider}</EuiFlexItem>
      <EuiFlexItem grow={false}>{kindBadge}</EuiFlexItem>
      <EuiFlexItem grow={false}>{divider}</EuiFlexItem>
      <EuiFlexItem grow={false}>{statusBadge}</EuiFlexItem>
    </EuiFlexGroup>
  );
};
