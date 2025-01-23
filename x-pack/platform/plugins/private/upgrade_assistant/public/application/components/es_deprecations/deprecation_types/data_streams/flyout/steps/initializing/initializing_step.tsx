/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutBody,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

/**
 * Displays warning text about destructive changes required to reindex this index. The user
 * must acknowledge each change before being allowed to proceed.
 */
export const InitializingFlyoutStep: React.FunctionComponent = () => {
  return (
    <>
      <EuiFlyoutBody>
        <EuiSpacer size="xxl" />
        <EuiSpacer size="xxl" />
        <EuiFlexGroup direction="column" alignItems="center" justifyContent="center">
          <EuiFlexItem>
            <EuiLoadingSpinner size="xl" />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiTitle size="s">
              <FormattedMessage
                id="xpack.upgradeAssistant.checkupTab.reindexing.flyout.warningsStep.acceptChangesTitle"
                defaultMessage="Loading Data stream info"
              />
            </EuiTitle>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutBody>
    </>
  );
};
