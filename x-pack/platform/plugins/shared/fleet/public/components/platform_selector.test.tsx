/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { waitFor } from '@testing-library/react';
import { PlatformSelector } from './platform_selector';
import {
  FLEET_CLOUD_SECURITY_POSTURE_KSPM_POLICY_TEMPLATE,
  FLEET_CLOUD_SECURITY_POSTURE_CSPM_POLICY_TEMPLATE,
} from '../../common/constants/epm';
import { createFleetTestRendererMock } from '../mock';

// Mock the usePlatform hook to control platform selection in tests
jest.mock('../hooks/use_platform', () => ({
  usePlatform: jest.fn(),
}));

const mockUsePlatform = require('../hooks/use_platform').usePlatform as jest.MockedFunction<any>;

const mockInstallCommand = {
  linux_aarch64: 'linux command',
  linux_x86_64: 'linux command',
  mac_aarch64: 'mac command',
  mac_x86_64: 'mac command',
  windows: 'windows command',
  windows_msi: 'windows msi command',
  deb_aarch64: 'deb command',
  deb_x86_64: 'deb command',
  rpm_aarch64: 'rpm command',
  rpm_x86_64: 'rpm command',
  kubernetes: 'kubectl apply',
  cloudFormation: '',
  googleCloudShell: 'gcloud command',
};

const defaultProps = {
  installCommand: mockInstallCommand,
  hasK8sIntegration: false,
  hasK8sIntegrationMultiPage: false,
  isManaged: true,
  fullCopyButton: false,
};

describe('PlatformSelector', () => {
  beforeEach(() => {
    // Reset the mock before each test
    mockUsePlatform.mockReset();
  });

  function renderWithFleetRenderer(props = {}) {
    const renderer = createFleetTestRendererMock();
    return renderer.render(
      <PlatformSelector
        {...defaultProps}
        {...props}
      />
    );
  }

  describe('Cloud Security Posture warnings', () => {
    it('should show Mac warning for CSPM integration when Mac platform is selected', async () => {
      // Mock usePlatform to return Mac platform
      mockUsePlatform.mockReturnValue({
        platform: 'mac_aarch64',
        setPlatform: jest.fn(),
      });

      const renderResult = renderWithFleetRenderer({
        cloudSecurityIntegration: {
          integrationType: FLEET_CLOUD_SECURITY_POSTURE_CSPM_POLICY_TEMPLATE,
        },
      });

      await waitFor(() => {
        expect(renderResult.getByText('Cloudbeat does not support macOS. This integration only supports Linux and Kubernetes deployments.')).toBeInTheDocument();
      });
    });

    it('should show Mac warning for KSPM integration when Mac platform is selected', async () => {
      mockUsePlatform.mockReturnValue({
        platform: 'mac_x86_64',
        setPlatform: jest.fn(),
      });

      const renderResult = renderWithFleetRenderer({
        cloudSecurityIntegration: {
          integrationType: FLEET_CLOUD_SECURITY_POSTURE_KSPM_POLICY_TEMPLATE,
        },
      });

      await waitFor(() => {
        expect(renderResult.getByText('Cloudbeat does not support macOS. This integration only supports Linux and Kubernetes deployments.')).toBeInTheDocument();
      });
    });

    it('should show Windows warning for CSPM integration when Windows platform is selected', async () => {
      mockUsePlatform.mockReturnValue({
        platform: 'windows',
        setPlatform: jest.fn(),
      });

      const renderResult = renderWithFleetRenderer({
        cloudSecurityIntegration: {
          integrationType: FLEET_CLOUD_SECURITY_POSTURE_CSPM_POLICY_TEMPLATE,
        },
      });

      await waitFor(() => {
        expect(renderResult.getByText('Cloudbeat does not support Windows. This integration only supports Linux and Kubernetes deployments.')).toBeInTheDocument();
      });
    });

    it('should show DEB/RPM enhanced warning for cloud security integrations', async () => {
      mockUsePlatform.mockReturnValue({
        platform: 'deb_x86_64',
        setPlatform: jest.fn(),
      });

      const renderResult = renderWithFleetRenderer({
        cloudSecurityIntegration: {
          integrationType: FLEET_CLOUD_SECURITY_POSTURE_CSPM_POLICY_TEMPLATE,
        },
      });

      await waitFor(() => {
        expect(renderResult.getByText(/While system packages \(DEB\/RPM\) can be used for manual deployment, note that Cloudbeat only supports Linux and Kubernetes environments/)).toBeInTheDocument();
      });
    });

    it('should show standard system package warning for non-CSP integrations', async () => {
      mockUsePlatform.mockReturnValue({
        platform: 'deb_x86_64',
        setPlatform: jest.fn(),
      });

      const renderResult = renderWithFleetRenderer();

      await waitFor(() => {
        expect(renderResult.getByText(/We recommend using the installers \(TAR\/ZIP\) over system packages \(RPM\/DEB\)/)).toBeInTheDocument();
      });
    });

    it('should not show CSP warnings for non-cloud-security integrations', async () => {
      mockUsePlatform.mockReturnValue({
        platform: 'mac_aarch64',
        setPlatform: jest.fn(),
      });

      const renderResult = renderWithFleetRenderer();

      await waitFor(() => {
        expect(renderResult.queryByText(/Cloudbeat does not support/)).not.toBeInTheDocument();
      });
    });
  });
});