/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiHealth } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { LevelInfoTip } from './level_info_tip';

const i18nTexts = {
  getCriticalStatusLabel: (count: number) =>
    i18n.translate('xpack.upgradeAssistant.deprecationCount.criticalStatusLabel', {
      defaultMessage: 'Critical: {count}',
      values: {
        count,
      },
    }),
  getWarningStatusLabel: (count: number) =>
    i18n.translate('xpack.upgradeAssistant.deprecationCount.warningStatusLabel', {
      defaultMessage: 'Warning: {count}',
      values: {
        count,
      },
    }),
};

interface Props {
  totalCriticalDeprecations: number;
  totalWarningDeprecations: number;
}

export const DeprecationCount: FunctionComponent<Props> = ({
  totalCriticalDeprecations,
  totalWarningDeprecations,
}) => {
  return (
    <EuiFlexGroup>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="xs" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiHealth color="danger" data-test-subj="criticalDeprecationsCount">
              {i18nTexts.getCriticalStatusLabel(totalCriticalDeprecations)}
            </EuiHealth>
          </EuiFlexItem>

          <EuiFlexItem>
            <LevelInfoTip level="critical" />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="xs" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiHealth color="subdued" data-test-subj="warningDeprecationsCount">
              {i18nTexts.getWarningStatusLabel(totalWarningDeprecations)}
            </EuiHealth>
          </EuiFlexItem>

          <EuiFlexItem>
            <LevelInfoTip level="warning" />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
