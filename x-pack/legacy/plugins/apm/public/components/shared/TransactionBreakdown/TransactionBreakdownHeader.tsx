/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';

import {
  EuiTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiBetaBadge,
  EuiButtonEmpty
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

const TransactionBreakdownHeader: React.FC<{
  showChart: boolean;
  hideShowChartButton: boolean;
  onToggleClick: () => void;
}> = ({ showChart, onToggleClick, hideShowChartButton }) => {
  return (
    <EuiFlexGroup>
      <EuiFlexItem>
        <EuiTitle size="xs">
          <h3>
            <EuiFlexGroup alignItems="center" gutterSize="s">
              <EuiFlexItem grow={false}>
                {i18n.translate('xpack.apm.transactionBreakdown.chartTitle', {
                  defaultMessage: 'Time spent by span type'
                })}
              </EuiFlexItem>
              <EuiSpacer size="xs" />
              <EuiFlexItem grow={false}>
                <EuiBetaBadge
                  label={i18n.translate('xpack.apm.ui.betaBadgeLabel', {
                    defaultMessage: 'Beta'
                  })}
                  tooltipContent={i18n.translate(
                    'xpack.apm.ui.betaBadgeTooltipTitle',
                    {
                      defaultMessage:
                        'This feature is still in development. If you have feedback, please reach out in our Discuss forum.'
                    }
                  )}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </h3>
        </EuiTitle>
      </EuiFlexItem>
      {!hideShowChartButton ? (
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="xs"
            iconType={showChart ? 'arrowDown' : 'arrowRight'}
            onClick={() => onToggleClick()}
          >
            {showChart
              ? i18n.translate('xpack.apm.transactionBreakdown.hideChart', {
                  defaultMessage: 'Hide chart'
                })
              : i18n.translate('xpack.apm.transactionBreakdown.showChart', {
                  defaultMessage: 'Show chart'
                })}
          </EuiButtonEmpty>
        </EuiFlexItem>
      ) : null}
    </EuiFlexGroup>
  );
};

export { TransactionBreakdownHeader };
