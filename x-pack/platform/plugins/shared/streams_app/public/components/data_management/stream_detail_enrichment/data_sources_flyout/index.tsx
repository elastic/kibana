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
  EuiFlyoutFooter,
  EuiFlexGroup,
  EuiButtonEmpty,
  EuiButton,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useDiscardConfirm } from '../../../../hooks/use_discard_confirm';

interface DataSourcesFlyoutProps {
  onApply: () => void;
  onClose: () => void;
  shouldConfirm?: boolean;
}

export const DataSourcesFlyout = ({
  onApply,
  onClose,
  shouldConfirm = false,
}: DataSourcesFlyoutProps) => {
  const handleClose = useDiscardConfirm(onClose);

  const closeHandler = shouldConfirm ? handleClose : onClose;

  return (
    <EuiFlyoutResizable onClose={closeHandler}>
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
      <EuiFlyoutBody>Content</EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiButtonEmpty iconType="cross" onClick={closeHandler}>
            {i18n.translate(
              'xpack.streams.streamDetailView.managementTab.enrichment.dataSourcesFlyout.cancel',
              { defaultMessage: 'Cancel' }
            )}
          </EuiButtonEmpty>
          <EuiButton iconType="cross" onClick={onApply}>
            {i18n.translate(
              'xpack.streams.streamDetailView.managementTab.enrichment.dataSourcesFlyout.apply',
              { defaultMessage: 'Apply changes' }
            )}
          </EuiButton>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyoutResizable>
  );
};
