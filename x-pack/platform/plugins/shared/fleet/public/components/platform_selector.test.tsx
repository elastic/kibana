/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { waitFor } from '@testing-library/react';

import { createFleetTestRendererMock } from '../mock';
import {
  FLEET_CLOUD_SECURITY_POSTURE_CSPM_POLICY_TEMPLATE,
  FLEET_CLOUD_SECURITY_POSTURE_KSPM_POLICY_TEMPLATE,
} from '../../common/constants/epm';

import type { CloudSecurityIntegration } from './agent_enrollment_flyout/types';
import { PlatformSelector } from './platform_selector';

const mockInstallCommand = {
  linux_aarch64: 'linux install command',
  linux_x86_64: 'linux install command',
  mac_aarch64: 'mac install command',
  mac_x86_64: 'mac install command',
  windows: 'windows install command',
  windows_msi: 'windows msi install command',
  rpm_aarch64: 'rpm install command',
  rpm_x86_64: 'rpm install command',
  deb_aarch64: 'deb install command',
  deb_x86_64: 'deb install command',
  kubernetes: 'kubectl apply command',
  google_shell: 'google shell command',
  cloud_formation: 'cloud formation command',
};

describe('PlatformSelector', () => {
  function render(
    props: Partial<React.ComponentProps<typeof PlatformSelector>> = {}
  ) {
    const renderer = createFleetTestRendererMock();
    return renderer.render(
      <PlatformSelector
        installCommand={mockInstallCommand}
        hasK8sIntegration={false}
        hasK8sIntegrationMultiPage={false}
        isManaged={true}
        {...props}
      />
    );
  }

  describe('Cloudbeat warning callouts', () => {
    const cspmIntegration: CloudSecurityIntegration = {
      integrationType: FLEET_CLOUD_SECURITY_POSTURE_CSPM_POLICY_TEMPLATE,
      isAzureArmTemplate: false,
      isCloudFormation: false,
    };

    const kspmIntegration: CloudSecurityIntegration = {
      integrationType: FLEET_CLOUD_SECURITY_POSTURE_KSPM_POLICY_TEMPLATE,
      isAzureArmTemplate: false,
      isCloudFormation: false,
    };

    it('should show macOS warning for CSPM integration', async () => {
      const renderResult = render({
        cloudSecurityIntegration: cspmIntegration,
      });

      // Select macOS platform
      const macButton = renderResult.getByTestId('platformTypeMac');
      macButton.click();

      await waitFor(() => {
        expect(
          renderResult.getByText(
            'Cloudbeat does not support macOS. This integration can only be deployed on Linux and Kubernetes environments.'
          )
        ).toBeInTheDocument();
      });
    });

    it('should show Windows warning for KSPM integration', async () => {
      const renderResult = render({
        cloudSecurityIntegration: kspmIntegration,
      });

      // Open extended platforms menu and select Windows
      const extendedButton = renderResult.getByTestId('platformSelectorExtended');
      extendedButton.click();

      await waitFor(() => {
        const windowsOption = renderResult.getByText('Windows x86_64');
        windowsOption.click();
      });

      await waitFor(() => {
        expect(
          renderResult.getByText(
            'Cloudbeat does not support Windows. This integration can only be deployed on Linux and Kubernetes environments.'
          )
        ).toBeInTheDocument();
      });
    });

    it('should show RPM/DEB warning for CSPM integration', async () => {
      const renderResult = render({
        cloudSecurityIntegration: cspmIntegration,
      });

      // Select RPM platform
      const rpmButton = renderResult.getByTestId('platformTypeLinuxRpm');
      rpmButton.click();

      await waitFor(() => {
        expect(
          renderResult.getByText(
            'Cloudbeat does not support RPM and DEB system packages. This integration can only be deployed on Linux and Kubernetes environments. Please use the Linux TAR installer instead.'
          )
        ).toBeInTheDocument();
      });
    });

    it('should show generic system package warning for non-Cloudbeat integration', async () => {
      const renderResult = render({
        cloudSecurityIntegration: undefined, // No cloud security integration
      });

      // Select RPM platform
      const rpmButton = renderResult.getByTestId('platformTypeLinuxRpm');
      rpmButton.click();

      await waitFor(() => {
        expect(
          renderResult.getByText(
            'We recommend using the installers (TAR/ZIP) over system packages (RPM/DEB) because they provide the ability to upgrade your agent with Fleet.'
          )
        ).toBeInTheDocument();
      });
    });

    it('should not show Cloudbeat warnings for non-Cloudbeat integrations', async () => {
      const renderResult = render({
        cloudSecurityIntegration: undefined,
      });

      // Select macOS platform
      const macButton = renderResult.getByTestId('platformTypeMac');
      macButton.click();

      await waitFor(() => {
        expect(
          renderResult.queryByText(
            'Cloudbeat does not support macOS. This integration can only be deployed on Linux and Kubernetes environments.'
          )
        ).not.toBeInTheDocument();
      });
    });
  });
});