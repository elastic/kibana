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
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { EMPTY_VALUE } from '../../../utils/rule_display';
import type { RuleSummarySectionProps } from '../types';

export const RuleSummaryAboutCard: React.FC<RuleSummarySectionProps> = ({ rule }) => {
  const { description, tags } = rule.metadata;

  return (
    <EuiPanel hasBorder hasShadow={false} paddingSize="m" data-test-subj="ruleSummaryAboutCard">
      <EuiFlexGroup direction="column" gutterSize="m">
        <EuiFlexItem grow={false}>
          <EuiTitle size="xxs">
            <h5>
              {i18n.translate('xpack.alertingV2.ruleSummary.description', {
                defaultMessage: 'Description',
              })}
            </h5>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiText size="s" data-test-subj="ruleDescription">
            {description || EMPTY_VALUE}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiTitle size="xxs">
            <h5>
              {i18n.translate('xpack.alertingV2.ruleSummary.ruleTags', {
                defaultMessage: 'Rule tags',
              })}
            </h5>
          </EuiTitle>
          <EuiSpacer size="s" />
          {tags?.length ? (
            <EuiFlexGroup gutterSize="xs" wrap responsive={false} data-test-subj="ruleTags">
              {tags.map((tag) => (
                <EuiFlexItem key={tag} grow={false}>
                  <EuiBadge color="hollow">{tag}</EuiBadge>
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
          ) : (
            EMPTY_VALUE
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
