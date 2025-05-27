/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlyoutResizable,
  EuiFlyoutHeader,
  EuiTitle,
  EuiFlyoutBody,
  EuiSpacer,
  EuiText,
  EuiCallOut,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

interface DataSourcesFlyoutProps {
  onClose: () => void;
}

export const DataSourcesFlyout = ({ onClose }: DataSourcesFlyoutProps) => {
  return (
    <EuiFlyoutResizable onClose={onClose}>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2>
            {i18n.translate(
              'xpack.streams.streamDetailView.managementTab.enrichment.dataSourcesFlyout.title',
              { defaultMessage: 'Manage simulation data sources' }
            )}
          </h2>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiText component="p" color="subdued">
          {i18n.translate(
            'xpack.streams.streamDetailView.managementTab.enrichment.dataSourcesFlyout.subtitle',
            {
              defaultMessage:
                'Configure data sources for simulation and testing. Each data source provides sample data for your analysis.',
            }
          )}
        </EuiText>
      </EuiFlyoutHeader>
      <EuiFlyoutBody
        banner={
          <EuiCallOut
            title={i18n.translate(
              'xpack.streams.streamDetailView.managementTab.enrichment.dataSourcesFlyout.bannerTitle',
              { defaultMessage: 'Data Sources usage' }
            )}
          >
            {i18n.translate(
              'xpack.streams.streamDetailView.managementTab.enrichment.dataSourcesFlyout.bannerDescription',
              {
                defaultMessage:
                  'Active data sources will be used for simulation. You can toggle data sources on/off without removing them.',
              }
            )}
          </EuiCallOut>
        }
      >
        Content
      </EuiFlyoutBody>
    </EuiFlyoutResizable>
  );
};
