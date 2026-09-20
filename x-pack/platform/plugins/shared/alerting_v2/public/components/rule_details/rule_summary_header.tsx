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
import { css } from '@emotion/react';
import React from 'react';
import { RULE_KIND_ICONS, RULE_KIND_LABELS, RULE_KIND_TOOLTIPS } from '@kbn/alerting-v2-constants';
import { useRule } from './rule_context';
import type { RuleApiResponse } from '../../services/rules_api';

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
 * Used by the Agent Builder rule attachment.
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
 * Shared by the rule details app header and rules table.
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
