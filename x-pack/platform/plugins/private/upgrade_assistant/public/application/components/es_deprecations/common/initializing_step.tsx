/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
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
  EuiModalBody,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

interface InitializingStepProps {
  errorMessage?: string | null;
  type: 'dataStream' | 'index';
  mode: 'modal' | 'flyout';
}

export const InitializingStep: React.FunctionComponent<InitializingStepProps> = ({
  errorMessage,
  type,
  mode,
}) => {
  const Wrapper = mode === 'modal' ? EuiModalBody : EuiFlyoutBody;
  const hasInitializingError = !!errorMessage;
  return (
    <Wrapper>
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
                id="xpack.upgradeAssistant.esDeprecations.initializingStep.errorLoadingIndexInfo"
                defaultMessage="Error loading {type, select, index {index} other {data stream}} info"
                values={{ type }}
              />
            ) : (
              <FormattedMessage
                id="xpack.upgradeAssistant.esDeprecations.initializingStep.loadingIndexInfo"
                defaultMessage="Loading {type, select, index {index} other {data stream}} info"
                values={{ type }}
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
    </Wrapper>
  );
};
