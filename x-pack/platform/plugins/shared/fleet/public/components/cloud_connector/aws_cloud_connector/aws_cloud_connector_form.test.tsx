/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';

import type { NewPackagePolicy, PackageInfo } from '../../../../common';
import { CLOUD_CONNECTOR_STACK_ARN_INPUT_TEST_SUBJ } from '../../../../common/services/cloud_connectors/test_subjects';

import type { AwsCloudConnectorCredentials } from '../types';
import type { UseCloudConnectorTemplateResult } from '../hooks/use_cloud_connector_template';

import { AWSCloudConnectorForm } from './aws_cloud_connector_form';

// Mock the template hook so we control isIacProvisionerEnabled and onTemplateRendered
jest.mock('../hooks/use_cloud_connector_template');
jest.mock('../../../../common/services/cloud_connectors', () => ({
  extractRawCredentialVars: jest.fn().mockReturnValue({}),
  getCredentialKeyFromVarName: jest.fn().mockReturnValue(undefined),
  // Use the real implementation so ARN validation works correctly in tests
  parseAwsRegionFromArn: jest.requireActual('../../../../common/services/cloud_connectors')
    .parseAwsRegionFromArn,
}));
jest.mock('../../../../common/services/policy_template', () => ({
  getEnabledInputsByPolicyTemplate: jest.fn().mockReturnValue([]),
}));
jest.mock('../form/cloud_connector_input_fields', () => ({
  CloudConnectorInputFields: () => null,
}));
jest.mock('../form/cloud_connector_name_field', () => ({
  CloudConnectorNameField: () => null,
}));
jest.mock('./aws_cloud_formation_guide', () => ({
  CloudFormationCloudCredentialsGuide: () => null,
}));
jest.mock('./aws_cloud_connector_options', () => ({
  getAwsCloudConnectorsCredentialsFormOptions: jest.fn().mockReturnValue(null),
}));

const { useCloudConnectorTemplate } = jest.requireMock('../hooks/use_cloud_connector_template') as {
  useCloudConnectorTemplate: jest.MockedFunction<
    (
      params: Parameters<
        typeof import('../hooks/use_cloud_connector_template').useCloudConnectorTemplate
      >[0]
    ) => UseCloudConnectorTemplateResult
  >;
};

const iacEnabledResult: UseCloudConnectorTemplateResult = {
  launchButtonProps: { onClick: jest.fn() },
  isDisabled: false,
  isGeneratingTemplate: false,
  templateGenerationError: undefined,
  isIacProvisionerEnabled: true,
};

const iacDisabledResult: UseCloudConnectorTemplateResult = {
  launchButtonProps: { href: undefined, target: '_blank' },
  isDisabled: true,
  isGeneratingTemplate: false,
  templateGenerationError: undefined,
  isIacProvisionerEnabled: false,
};

const renderWithIntl = (ui: React.ReactElement) => render(<I18nProvider>{ui}</I18nProvider>);

const makePolicy = (): NewPackagePolicy =>
  ({
    id: 'p1',
    name: 'test',
    namespace: 'default',
    enabled: true,
    policy_ids: [],
    inputs: [],
    supports_cloud_connector: true,
  } as unknown as NewPackagePolicy);

const makePackageInfo = (): PackageInfo =>
  ({
    name: 'cloud_security_posture',
    title: 'CSP',
    version: '1.0.0',
    release: 'ga',
    description: '',
    type: 'integration',
    owner: { github: 'elastic/security-service-integrations' },
    format_version: '1.0.0',
    policy_templates: [],
  } as unknown as PackageInfo);

describe('AWSCloudConnectorForm', () => {
  const mockSetCredentials = jest.fn();

  const defaultCredentials: AwsCloudConnectorCredentials = {
    name: 'My connector',
    roleArn: 'arn:aws:iam::123456789012:role/TestRole',
  };

  const defaultProps = {
    newPolicy: makePolicy(),
    packageInfo: makePackageInfo(),
    updatePolicy: jest.fn(),
    hasInvalidRequiredVars: false,
    credentials: defaultCredentials,
    setCredentials: mockSetCredentials,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    useCloudConnectorTemplate.mockReturnValue(iacEnabledResult);
  });

  describe('stack ARN field visibility', () => {
    it('renders the stack ARN input when IaCP is enabled', () => {
      useCloudConnectorTemplate.mockReturnValue(iacEnabledResult);
      renderWithIntl(<AWSCloudConnectorForm {...defaultProps} />);
      expect(screen.getByTestId(CLOUD_CONNECTOR_STACK_ARN_INPUT_TEST_SUBJ)).toBeInTheDocument();
    });

    it('does not render the stack ARN input when IaCP is disabled', () => {
      useCloudConnectorTemplate.mockReturnValue(iacDisabledResult);
      renderWithIntl(<AWSCloudConnectorForm {...defaultProps} />);
      expect(
        screen.queryByTestId(CLOUD_CONNECTOR_STACK_ARN_INPUT_TEST_SUBJ)
      ).not.toBeInTheDocument();
    });
  });

  describe('stack ARN field interaction', () => {
    it('calls setCredentials with iacDeploymentId set to the trimmed value when a valid ARN is entered', () => {
      useCloudConnectorTemplate.mockReturnValue(iacEnabledResult);
      renderWithIntl(<AWSCloudConnectorForm {...defaultProps} />);

      const input = screen.getByTestId(CLOUD_CONNECTOR_STACK_ARN_INPUT_TEST_SUBJ);
      // Use fireEvent.change to set the full value in a single event, avoiding
      // the controlled-input reset that happens character-by-character with userEvent.type.
      fireEvent.change(input, {
        target: { value: 'arn:aws:cloudformation:us-east-1:123456789012:stack/s/u' },
      });

      expect(mockSetCredentials).toHaveBeenCalledWith(
        expect.objectContaining({
          iacDeploymentId: 'arn:aws:cloudformation:us-east-1:123456789012:stack/s/u',
        })
      );
    });

    it('marks the form row invalid with error text when an invalid ARN is present', () => {
      const credentialsWithBadArn: AwsCloudConnectorCredentials = {
        ...defaultCredentials,
        iacDeploymentId: 'not-a-valid-arn',
      };

      useCloudConnectorTemplate.mockReturnValue(iacEnabledResult);
      renderWithIntl(
        <AWSCloudConnectorForm {...defaultProps} credentials={credentialsWithBadArn} />
      );

      // The EuiFormRow should show an error message about the ARN
      expect(screen.getByText(/Enter a CloudFormation stack ARN/i)).toBeInTheDocument();
    });
  });

  describe('onTemplateRendered callback', () => {
    it('calls setCredentials with iacKey when the template hook calls onTemplateRendered', () => {
      let capturedOnTemplateRendered: ((rendered: { key?: string }) => void) | undefined;

      useCloudConnectorTemplate.mockImplementation((params) => {
        capturedOnTemplateRendered = params.onTemplateRendered;
        return iacEnabledResult;
      });

      renderWithIntl(<AWSCloudConnectorForm {...defaultProps} />);

      act(() => {
        capturedOnTemplateRendered?.({ key: 'sha256:abc' });
      });

      expect(mockSetCredentials).toHaveBeenCalledWith(
        expect.objectContaining({ iacKey: 'sha256:abc' })
      );
    });

    it('uses the latest credentials when onTemplateRendered fires after a prop update', () => {
      // Regression: onTemplateRendered is called after an async render. Without the
      // latest-value ref, a name edit made while the render runs would be overwritten
      // by the stale credentials snapshot captured when the callback was created.
      //
      // The test intentionally fires the callback captured from the FIRST render (not
      // the one captured after rerender) so it would fail against the old
      // useCallback([credentials, setCredentials]) implementation, which would have
      // closed over the stale first-render credentials.
      let capturedOnTemplateRendered: ((rendered: { key?: string }) => void) | undefined;

      useCloudConnectorTemplate.mockImplementation((params) => {
        capturedOnTemplateRendered = params.onTemplateRendered;
        return iacEnabledResult;
      });

      const { rerender } = renderWithIntl(<AWSCloudConnectorForm {...defaultProps} />);

      // Save the callback reference from the initial render before the rerender updates it.
      const callbackFromFirstRender = capturedOnTemplateRendered;

      // Simulate a name edit that arrives while the async render is in flight.
      const editedCredentials: AwsCloudConnectorCredentials = {
        ...defaultCredentials,
        name: 'Edited',
      };
      rerender(
        <I18nProvider>
          <AWSCloudConnectorForm {...defaultProps} credentials={editedCredentials} />
        </I18nProvider>
      );

      // The callback must be the same reference across renders (stable identity from empty deps).
      // With the old useCallback([credentials, setCredentials]), a changed credentials prop would
      // produce a new function reference and this assertion would fail.
      expect(capturedOnTemplateRendered).toBe(callbackFromFirstRender);

      // Invoke the callback captured from the FIRST render — it must see the edited name
      // because the latest-value ref (not the closure) is read at call time.
      act(() => {
        callbackFromFirstRender?.({ key: 'sha256:abc' });
      });

      expect(mockSetCredentials).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Edited', iacKey: 'sha256:abc' })
      );
    });
  });
});
