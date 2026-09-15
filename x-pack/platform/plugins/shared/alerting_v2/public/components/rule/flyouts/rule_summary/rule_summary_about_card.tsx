/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useRule } from '../../../rule_details/rule_context';
import { RuleTagsList } from '../../../rule_details/rule_summary_header';
import { EMPTY_VALUE } from '../../../rule_details/utils';

export const RuleSummaryAboutCard: React.FC = () => {
  const { metadata } = useRule();
  const { description, tags } = metadata;

  return (
    <EuiPanel
      hasBorder
      hasShadow={false}
      paddingSize="m"
      data-test-subj="ruleSummaryFlyoutAboutCard"
    >
      <EuiFlexGroup direction="column" gutterSize="m">
        <EuiFlexItem grow={false}>
          <EuiTitle size="xxs">
            <h5>
              {i18n.translate('xpack.alertingV2.ruleSummaryFlyout.description', {
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
              {i18n.translate('xpack.alertingV2.ruleSummaryFlyout.ruleTags', {
                defaultMessage: 'Rule tags',
              })}
            </h5>
          </EuiTitle>
          <EuiSpacer size="s" />
          {tags && tags.length > 0 ? <RuleTagsList /> : EMPTY_VALUE}
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
