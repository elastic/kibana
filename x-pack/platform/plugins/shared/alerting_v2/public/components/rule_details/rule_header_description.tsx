/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiIcon, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import type { RuleApiResponse } from '../../services/rules_api';

export interface RuleHeaderDescriptionProps {
  rule: RuleApiResponse;
}

const KIND_LABELS: Record<string, string> = {
  signal: i18n.translate('xpack.alertingV2.ruleDetails.kindSignal', {
    defaultMessage: 'Detect only',
  }),
  alert: i18n.translate('xpack.alertingV2.ruleDetails.kindAlert', {
    defaultMessage: 'Alert',
  }),
};

const KIND_ICONS: Record<string, string> = {
  signal: 'securitySignalResolved',
  alert: 'bell',
};

/**
 * Renders the tags row below the page title.
 */
export const RuleHeaderDescription: React.FC<RuleHeaderDescriptionProps> = ({ rule }) => {
  if (!rule.metadata.labels || rule.metadata.labels.length === 0) {
    return null;
  }

  return (
    <EuiFlexGroup gutterSize="xs" wrap responsive={false} data-test-subj="ruleTags">
      {rule.metadata.labels.map((label) => (
        <EuiFlexItem key={label} grow={false}>
          <EuiBadge color="hollow">{label}</EuiBadge>
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};

/**
 * Rule name with kind and status rendered inline, separated by vertical dividers.
 */
export const RuleTitleWithBadges: React.FC<RuleHeaderDescriptionProps> = ({ rule }) => {
  return (
    <EuiFlexGroup alignItems="center" gutterSize="m" wrap={false} responsive={false}>
      <EuiFlexItem grow={false}>
        <span data-test-subj="ruleName">{rule.metadata.name}</span>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText size="s" color="subdued" aria-hidden={true}>
          |
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup
          alignItems="center"
          gutterSize="xs"
          wrap={false}
          responsive={false}
          data-test-subj="kindBadge"
        >
          <EuiFlexItem grow={false}>
            <EuiIcon
              type={KIND_ICONS[rule.kind] ?? 'dot'}
              size="m"
              color="subdued"
              aria-hidden={true}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="s" color="subdued">
              {KIND_LABELS[rule.kind] ?? rule.kind}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText size="s" color="subdued" aria-hidden={true}>
          |
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        {rule.enabled ? (
          <EuiBadge color="success" data-test-subj="enabledBadge">
            {i18n.translate('xpack.alertingV2.ruleDetails.enabled', {
              defaultMessage: 'Enabled',
            })}
          </EuiBadge>
        ) : (
          <EuiBadge color="subdued" data-test-subj="disabledBadge">
            {i18n.translate('xpack.alertingV2.ruleDetails.disabled', {
              defaultMessage: 'Disabled',
            })}
          </EuiBadge>
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
