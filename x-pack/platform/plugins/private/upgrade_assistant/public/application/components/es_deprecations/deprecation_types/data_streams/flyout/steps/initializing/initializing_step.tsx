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
  EuiIcon,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

interface InitializingFlyoutStepProps {
  errorMessage?: string | null;
}

export const InitializingFlyoutStep: React.FunctionComponent<InitializingFlyoutStepProps> = ({
  errorMessage,
}) => {
  const hasInitializingError = !!errorMessage;
  return (
    <>
      <EuiFlyoutBody>
        <EuiSpacer size="xxl" />
        <EuiSpacer size="xxl" />
        <EuiFlexGroup direction="column" alignItems="center" justifyContent="center">
          <EuiFlexItem>
            {hasInitializingError ? (
              <EuiIcon type="alert" size="xl" color="danger" />
            ) : (
              <EuiLoadingSpinner size="xl" />
            )}
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiTitle size="s">
              {hasInitializingError ? (
                <FormattedMessage
                  id="xpack.upgradeAssistant.dataStream.reindexing.flyout.initializingStep.errorLoadingDataStreamInfo"
                  defaultMessage="Error loading data stream info"
                />
              ) : (
                <FormattedMessage
                  id="xpack.upgradeAssistant.dataStream.reindexing.flyout.initializingStep.loadingDataStreamInfo"
                  defaultMessage="Loading Data stream info"
                />
              )}
            </EuiTitle>
          </EuiFlexItem>
          {hasInitializingError && (
            <EuiFlexItem>
              <EuiText>{errorMessage}</EuiText>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiFlyoutBody>
    </>
  );
};
