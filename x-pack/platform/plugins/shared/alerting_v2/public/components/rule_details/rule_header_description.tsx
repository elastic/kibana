/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { CoreStart, useService } from '@kbn/core-di-browser';
import moment from 'moment';
import React from 'react';
import type { RuleApiResponse } from '../../services/rules_api';

export interface RuleDetailPageProps {
  rule: RuleApiResponse;
}

export const RuleHeaderDescription: React.FC<RuleDetailPageProps> = ({ rule }) => {
  const uiSettings = useService(CoreStart('uiSettings'));
  const dateFormat = uiSettings.get('dateFormat'); // e.g. "MMM D, YYYY @ HH:mm:ss.SSS"

  const formatDate = (value: string) => {
    const m = moment(value);
    return m.format(dateFormat);
  };

  return (
    <>
      <EuiFlexGroup alignItems="center" justifyContent="flexStart" gutterSize="s" wrap={false}>
        <EuiFlexItem>
          <EuiFlexGroup alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued" data-test-subj="ruleType">
                <FormattedMessage
                  id="xpack.alertingV2.sections.ruleDetails.statusLabel"
                  defaultMessage="Status"
                />
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              {rule.enabled ? (
                <EuiBadge color="success" data-test-subj="enabledBadge">
                  <FormattedMessage
                    id="xpack.alertingV2.sections.ruleDetails.enabled"
                    defaultMessage="Enabled"
                  />
                </EuiBadge>
              ) : (
                <EuiBadge color="subdued" data-test-subj="disabledBadge">
                  <FormattedMessage
                    id="xpack.alertingV2.sections.ruleDetails.disabled"
                    defaultMessage="Disabled"
                  />
                </EuiBadge>
              )}
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFlexGroup gutterSize="s" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued" data-test-subj="ruleType">
                <FormattedMessage
                  id="xpack.alertingV2.sections.ruleDetails.kindLabel"
                  defaultMessage="Kind"
                />
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiBadge color="hollow" data-test-subj="kindBadge">
                <FormattedMessage
                  id="xpack.alertingV2.sections.ruleDetails.kindValue"
                  defaultMessage="{ruleType}"
                  values={{ ruleType: rule.kind }}
                />
              </EuiBadge>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFlexGroup gutterSize="s" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued" data-test-subj="ruleTags">
                <FormattedMessage
                  id="xpack.alertingV2.sections.ruleDetails.tagsLabel"
                  defaultMessage="Tags"
                />
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem>
              {rule.metadata.labels ? (
                <EuiFlexGroup gutterSize="xs" data-test-subj="ruleTags">
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
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <EuiFlexGroup alignItems="center" justifyContent="flexStart" gutterSize="s" wrap={false}>
        <EuiFlexItem>
          <EuiFlexGroup gutterSize="s" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued" data-test-subj="ruleCreatedBy">
                <FormattedMessage
                  id="xpack.alertingV2.sections.ruleDetails.createdByLabel"
                  defaultMessage="Created by"
                />
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="xs" data-test-subj="ruleCreatedByValue">
                <strong>{rule.createdBy}</strong>
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFlexGroup gutterSize="s" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued" data-test-subj="ruleCreatedDate">
                <FormattedMessage
                  id="xpack.alertingV2.sections.ruleDetails.createdDateLabel"
                  defaultMessage="Created at"
                />
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText
                size="xs"
                data-test-subj="ruleCreatedDateValue"
                css={{ whiteSpace: 'nowrap' }}
              >
                <strong>{formatDate(rule.createdAt)}</strong>
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFlexGroup gutterSize="s" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued" data-test-subj="ruleUpdatedDate">
                <FormattedMessage
                  id="xpack.alertingV2.sections.ruleDetails.updatedDateLabel"
                  defaultMessage="Updated at"
                />
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText
                size="xs"
                data-test-subj="ruleUpdatedDateValue"
                css={{ whiteSpace: 'nowrap' }}
              >
                <strong>{formatDate(rule.updatedAt)}</strong>
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
