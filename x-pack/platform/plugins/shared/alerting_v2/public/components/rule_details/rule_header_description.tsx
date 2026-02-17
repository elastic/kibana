/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import type { RuleApiResponse } from '../../services/rules_api';

export interface RuleDetailPageProps {
  rule: RuleApiResponse;
}

const EMPTY_VALUE = '-';

const formatMaybeIsoDateTime = (value: string | undefined) => {
  if (!value) {
    return EMPTY_VALUE;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return EMPTY_VALUE;
  }

  const datePart = new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  }).format(date);
  const timePart = new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);

  return i18n.translate('xpack.alertingV2.ruleDetails.dateTime', {
    defaultMessage: '{date} at {time}',
    values: { date: datePart, time: timePart },
  });
};

export const RuleHeaderDescription: React.FC<RuleDetailPageProps> = ({ rule }) => {
  return (
    <EuiFlexGroup
      alignItems="center"
      justifyContent="flexStart"
      gutterSize="s"
      wrap={false}
      responsive={false}
    >
      <EuiFlexItem grow={false}>
        <EuiFlexGroup responsive={false} alignItems="center">
          <EuiFlexItem grow={false}>
            {rule.enabled ? (
              <EuiBadge color="success" data-test-subj="enabledBadge">
                <FormattedMessage
                  id="xpack.triggersActionsUI.sections.ruleDetails.enabled"
                  defaultMessage="Enabled"
                />
              </EuiBadge>
            ) : (
              <EuiBadge color="subdued" data-test-subj="disabledBadge">
                <FormattedMessage
                  id="xpack.triggersActionsUI.sections.ruleDetails.disabled"
                  defaultMessage="Disabled"
                />
              </EuiBadge>
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup responsive={false} gutterSize="s" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued" data-test-subj="ruleType">
              <FormattedMessage
                id="xpack.triggersActionsUI.sections.ruleDetails.kindLabel"
                defaultMessage="Kind"
              />
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiBadge color="hollow" data-test-subj="kindBadge">
              <FormattedMessage
                id="xpack.triggersActionsUI.sections.ruleDetails.kindValue"
                defaultMessage="{ruleType}"
                values={{ ruleType: rule.kind }}
              />
            </EuiBadge>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiFlexGroup responsive={false} gutterSize="s" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued" data-test-subj="ruleTags">
              <FormattedMessage
                id="xpack.triggersActionsUI.sections.ruleDetails.tagsLabel"
                defaultMessage="Tags"
              />
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            {rule.metadata.labels ? (
              <EuiFlexGroup gutterSize="xs" wrap responsive={false} data-test-subj="ruleTags">
                {rule.metadata.labels.map((label) => (
                  <EuiFlexItem key={label} grow={false}>
                    <EuiBadge color="hollow">{label}</EuiBadge>
                  </EuiFlexItem>
                ))}
              </EuiFlexGroup>
            ) : (
              '-'
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiFlexGroup responsive={false} gutterSize="s" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued" data-test-subj="ruleCreatedBy">
              <FormattedMessage
                id="xpack.triggersActionsUI.sections.ruleDetails.createdByLabel"
                defaultMessage="Created by"
              />
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText size="xs" data-test-subj="ruleCreatedByValue">
              <strong>{rule.createdBy}</strong>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup responsive={false} gutterSize="s" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued" data-test-subj="ruleCreatedDate">
              <FormattedMessage
                id="xpack.triggersActionsUI.sections.ruleDetails.createdDateLabel"
                defaultMessage="Created"
              />
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="xs" data-test-subj="ruleCreatedDateValue" css={{ whiteSpace: 'nowrap' }}>
              <strong>{formatMaybeIsoDateTime(rule.createdAt)}</strong>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup responsive={false} gutterSize="s" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued" data-test-subj="ruleUpdatedDate">
              <FormattedMessage
                id="xpack.triggersActionsUI.sections.ruleDetails.updatedDateLabel"
                defaultMessage="Updated"
              />
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="xs" data-test-subj="ruleUpdatedDateValue" css={{ whiteSpace: 'nowrap' }}>
              <strong>{formatMaybeIsoDateTime(rule.updatedAt)}</strong>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
