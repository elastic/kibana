/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiPanel, EuiFlexGroup, EuiFlexItem, EuiImage, EuiText, EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import icon from './assets/illustration_product_no_results_magnifying_glass.svg';
import { useTestIdGenerator } from '../../hooks/use_test_id_generator';

export const NoDataCallout = ({
  'data-test-subj': dateTestSubj,
}: {
  'data-test-subj'?: string;
}) => {
  const getTestId = useTestIdGenerator(dateTestSubj);

  return (
    <EuiFlexGroup
      style={{ height: 490 }}
      alignItems="center"
      justifyContent="center"
      data-test-subj={getTestId('no-charts-callout')}
    >
      <EuiFlexItem grow={false}>
        <EuiPanel hasBorder={true} style={{ maxWidth: 500 }}>
          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiText size="s">
                <EuiTitle>
                  <h3>
                    <FormattedMessage
                      id="xpack.dataUsage.noCharts.title"
                      defaultMessage="No chart data without data streams"
                    />
                  </h3>
                </EuiTitle>
                <p>
                  <FormattedMessage
                    id="xpack.dataUsage.noCharts.description"
                    defaultMessage="Try searching with at least one data stream."
                  />
                </p>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiImage style={{ width: 200, height: 148 }} size="200" alt="" url={icon} />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

NoDataCallout.displayName = 'NoDataCallout';
