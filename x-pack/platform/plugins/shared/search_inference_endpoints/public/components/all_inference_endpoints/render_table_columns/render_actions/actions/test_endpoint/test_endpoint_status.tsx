/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { EuiTextProps } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiLoadingSpinner, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { TestEndpointResponse } from '../../../../../../../common/types';

type TestEndpointState = 'loading' | 'available' | 'failure';

const STATES: Record<
  TestEndpointState,
  { icon: React.ReactNode; color: EuiTextProps['color']; message: string; testSubj: string }
> = {
  loading: {
    testSubj: 'testEndpointLoading',
    icon: <EuiLoadingSpinner size="m" />,
    color: 'subdued',
    message: i18n.translate('xpack.searchInferenceEndpoints.testEndpoint.waiting', {
      defaultMessage: 'Waiting for response...',
    }),
  },
  available: {
    testSubj: 'testEndpointAvailable',
    icon: <EuiIcon type="checkCircleFill" color="success" aria-hidden={true} />,
    color: 'success',
    message: i18n.translate('xpack.searchInferenceEndpoints.testEndpoint.available', {
      defaultMessage: 'Test succeeded.',
    }),
  },
  failure: {
    testSubj: 'testEndpointFailure',
    icon: <EuiIcon type="warningFill" color="danger" aria-hidden={true} />,
    color: 'danger',
    message: i18n.translate('xpack.searchInferenceEndpoints.testEndpoint.failed', {
      defaultMessage: 'Endpoint test failed.',
    }),
  },
};

interface TestEndpointStatusProps {
  isLoading: boolean;
  response?: TestEndpointResponse;
}

export const TestEndpointStatus: React.FC<TestEndpointStatusProps> = ({ isLoading, response }) => {
  if (!isLoading && !response) {
    return (
      <EuiText size="s" color="subdued" data-test-subj="testEndpointIdle">
        {i18n.translate('xpack.searchInferenceEndpoints.testEndpoint.idle', {
          defaultMessage: 'Run test to confirm endpoint availability.',
        })}
      </EuiText>
    );
  }

  const state: TestEndpointState = isLoading ? 'loading' : response?.ok ? 'available' : 'failure';
  const { icon, color, message, testSubj } = STATES[state];

  return (
    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} data-test-subj={testSubj}>
      <EuiFlexItem grow={false}>{icon}</EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText size="s" color={color}>
          {message}
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
