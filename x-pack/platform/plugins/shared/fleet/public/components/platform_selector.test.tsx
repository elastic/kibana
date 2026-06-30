/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import type { TestRenderer } from '../mock';
import { createFleetTestRendererMock } from '../mock';

import { PlatformSelector } from './platform_selector';

const mockSetPlatform = jest.fn();
jest.mock('../hooks/use_platform', () => ({
  usePlatform: () => ({
    platform: 'windows',
    setPlatform: mockSetPlatform,
  }),
}));

describe('PlatformSelector', () => {
  let testRenderer: TestRenderer;

  const mockInstallCommand = {
    linux_aarch64: 'mock linux aarch64 command',
    linux_x86_64: 'mock linux x86_64 command',
    mac_aarch64: 'mock mac aarch64 command',
    mac_x86_64: 'mock mac x86_64 command',
    windows: 'mock windows command',
    windows_msi: 'mock windows msi command',
    deb_aarch64: 'mock deb aarch64 command',
    deb_x86_64: 'mock deb x86_64 command',
    rpm_aarch64: 'mock rpm aarch64 command',
    rpm_x86_64: 'mock rpm x86_64 command',
    kubernetes: 'mock kubernetes command',
    cloudFormation: 'mock cloudformation command',
    googleCloudShell: 'mock google cloud shell command',
  };

  const defaultProps = {
    installCommand: mockInstallCommand,
    hasK8sIntegration: false,
    hasK8sIntegrationMultiPage: false,
    isManaged: true,
  };

  beforeEach(() => {
    testRenderer = createFleetTestRendererMock();
    mockSetPlatform.mockClear();
  });

  describe('Windows platforms', () => {
    beforeEach(() => {
      (require('../hooks/use_platform').usePlatform as jest.Mock).mockReturnValue({
        platform: 'windows',
        setPlatform: mockSetPlatform,
      });
    });

    test('should show Cloudbeat warning for Windows with CSPM integration', () => {
      const props = {
        ...defaultProps,
        cloudSecurityIntegration: {
          integrationType: 'cspm',
        },
      };

      const results = testRenderer.render(<PlatformSelector {...props} />);
      
      expect(results.container.textContent).toContain(
        'This platform is not supported by Cloudbeat'
      );
      expect(results.container.textContent).toContain(
        'Cloudbeat only supports Linux and Kubernetes environments'
      );
    });

    test('should show Cloudbeat warning for Windows with KSPM integration', () => {
      const props = {
        ...defaultProps,
        cloudSecurityIntegration: {
          integrationType: 'kspm',
        },
      };

      const results = testRenderer.render(<PlatformSelector {...props} />);
      
      expect(results.container.textContent).toContain(
        'This platform is not supported by Cloudbeat'
      );
    });

    test('should show Cloudbeat warning for Windows with CNVM integration', () => {
      const props = {
        ...defaultProps,
        cloudSecurityIntegration: {
          integrationType: 'vuln_mgmt',
        },
      };

      const results = testRenderer.render(<PlatformSelector {...props} />);
      
      expect(results.container.textContent).toContain(
        'This platform is not supported by Cloudbeat'
      );
    });

    test('should not show Cloudbeat warning for Windows without cloud security integration', () => {
      const results = testRenderer.render(<PlatformSelector {...defaultProps} />);
      
      expect(results.container.textContent).not.toContain(
        'This platform is not supported by Cloudbeat'
      );
    });
  });

  describe('macOS platforms', () => {
    beforeEach(() => {
      (require('../hooks/use_platform').usePlatform as jest.Mock).mockReturnValue({
        platform: 'mac_aarch64',
        setPlatform: mockSetPlatform,
      });
    });

    test('should show Cloudbeat warning for macOS with CSPM integration', () => {
      const props = {
        ...defaultProps,
        cloudSecurityIntegration: {
          integrationType: 'cspm',
        },
      };

      const results = testRenderer.render(<PlatformSelector {...props} />);
      
      expect(results.container.textContent).toContain(
        'This platform is not supported by Cloudbeat'
      );
    });
  });

  describe('DEB/RPM platforms', () => {
    beforeEach(() => {
      (require('../hooks/use_platform').usePlatform as jest.Mock).mockReturnValue({
        platform: 'deb_x86_64',
        setPlatform: mockSetPlatform,
      });
    });

    test('should show Cloudbeat warning for DEB with CSPM integration', () => {
      const props = {
        ...defaultProps,
        cloudSecurityIntegration: {
          integrationType: 'cspm',
        },
      };

      const results = testRenderer.render(<PlatformSelector {...props} />);
      
      expect(results.container.textContent).toContain(
        'This platform is not supported by Cloudbeat'
      );
      // Should also show the system package callout
      expect(results.container.textContent).toContain(
        'We recommend using the installers (TAR/ZIP) over system packages'
      );
    });

    test('should only show system package warning for DEB without cloud security integration', () => {
      const results = testRenderer.render(<PlatformSelector {...defaultProps} />);
      
      expect(results.container.textContent).not.toContain(
        'This platform is not supported by Cloudbeat'
      );
      expect(results.container.textContent).toContain(
        'We recommend using the installers (TAR/ZIP) over system packages'
      );
    });
  });
});