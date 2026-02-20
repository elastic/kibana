/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { createIntegrationsTestRendererMock } from '../../../../../../mock';
import type { PackageListItem } from '../../../../types';
import { ExperimentalFeaturesService } from '../../../../services';

import { getIntegrationLabels, mapToCard } from './card_utils';

function renderIntegrationLabels(item: Partial<PackageListItem>) {
  const renderer = createIntegrationsTestRendererMock();

  return renderer.render(<>{getIntegrationLabels(item as any)}</>);
}

const addBasePath = (s: string) => s;
const getHref = (k: string) => k;

describe('Card utils', () => {
  describe('mapToCard', () => {
    beforeEach(() => {
      ExperimentalFeaturesService.init({} as any);
    });

    it('should use the installed version if available, without prelease', () => {
      const cardItem = mapToCard({
        item: {
          id: 'test',
          version: '2.0.0-preview-1',
          installationInfo: {
            version: '1.0.0',
          },
        },
        addBasePath,
        getHref,
      } as any);

      expect(cardItem).toMatchObject({
        release: 'ga',
        version: '1.0.0',
        isUpdateAvailable: true,
        extraLabelsBadges: undefined,
      });
    });

    it('should use the installed version if available, with prelease ', () => {
      const cardItem = mapToCard({
        item: {
          id: 'test',
          version: '2.0.0',
          installationInfo: {
            version: '1.0.0-preview-1',
          },
        },
        addBasePath,
        getHref,
      } as any);

      expect(cardItem).toMatchObject({
        release: 'preview',
        version: '1.0.0-preview-1',
        isUpdateAvailable: true,
      });
    });

    it('should use the registry version if no installation is available ', () => {
      const cardItem = mapToCard({
        item: {
          id: 'test',
          version: '2.0.0-preview-1',
        },
        addBasePath,
        getHref,
      } as any);

      expect(cardItem).toMatchObject({
        release: 'preview',
        version: '2.0.0-preview-1',
        isUpdateAvailable: false,
      });
    });

    it('should return installStatus if the item is an integration', () => {
      const cardItem = mapToCard({
        item: {
          id: 'test',
          version: '2.0.0-preview-1',
          type: 'integration',
          installationInfo: {
            version: '1.0.0',
            install_status: 'install_failed',
          },
        },
        addBasePath,
        getHref,
      } as any);

      expect(cardItem).toMatchObject({
        release: 'ga',
        version: '1.0.0',
        isUpdateAvailable: true,
        installStatus: 'install_failed',
      });
    });

    it('should not return installStatus if the item is not an integration', () => {
      const cardItem = mapToCard({
        item: {
          id: 'test',
          version: '2.0.0-preview-1',
          type: 'xxx',
          installationInfo: {
            version: '1.0.0',
            install_status: 'install_failed',
          },
        },
        addBasePath,
        getHref,
      } as any);

      expect(cardItem).toMatchObject({
        release: 'ga',
        version: '1.0.0',
        isUpdateAvailable: true,
      });
    });

    it('should set isDeprecated to false when item is not deprecated', () => {
      const cardItem = mapToCard({
        item: {
          id: 'test',
          name: 'test',
          title: 'Test Package',
          version: '1.0.0',
          type: 'integration',
        },
        addBasePath,
        getHref,
      } as any);

      expect(cardItem).toMatchObject({
        isDeprecated: false,
        deprecationInfo: undefined,
      });
    });

    it('should extract deprecation info when item is deprecated', () => {
      const deprecationInfo = {
        description: 'This integration is deprecated',
      };

      const cardItem = mapToCard({
        item: {
          id: 'test',
          name: 'test',
          title: 'Test Package',
          version: '1.0.0',
          type: 'integration',
          deprecated: deprecationInfo,
        },
        addBasePath,
        getHref,
      } as any);

      expect(cardItem).toMatchObject({
        isDeprecated: true,
        deprecationInfo,
      });
    });

    it('should extract full deprecation info including since and replaced_by', () => {
      const deprecationInfo = {
        description: 'This integration is deprecated, use new-package instead',
        since: '8.0.0',
        replaced_by: {
          package: 'new-package',
          policyTemplate: 'default',
        },
      };

      const cardItem = mapToCard({
        item: {
          id: 'old-package',
          name: 'old-package',
          title: 'Old Package',
          version: '1.0.0',
          type: 'integration',
          deprecated: deprecationInfo,
        },
        addBasePath,
        getHref,
      } as any);

      expect(cardItem).toMatchObject({
        isDeprecated: true,
        deprecationInfo: {
          description: 'This integration is deprecated, use new-package instead',
          since: '8.0.0',
          replaced_by: {
            package: 'new-package',
            policyTemplate: 'default',
          },
        },
      });
    });
  });
  describe('getIntegrationLabels', () => {
    it('should return an empty list for an integration without errors', () => {
      const res = renderIntegrationLabels({
        installationInfo: {
          install_status: 'installed',
        } as any,
      });
      const badges = res.container.querySelectorAll('.euiBadge');
      expect(badges).toHaveLength(0);
    });

    it('should return a badge for install_failed for an integration with status:install_failled', () => {
      const res = renderIntegrationLabels({
        installationInfo: {
          install_status: 'install_failed',
        } as any,
      });
      const badges = res.container.querySelectorAll('.euiBadge');
      expect(badges).toHaveLength(1);
      expect(res.queryByText('Install failed')).not.toBeNull();
    });

    it('should return a badge if there is an upgrade failed in the last_attempt_errors', () => {
      const res = renderIntegrationLabels({
        installationInfo: {
          version: '1.0.0',
          install_status: 'installed',
          latest_install_failed_attempts: [
            {
              created_at: new Date().toISOString(),
              error: {
                name: 'Test',
                message: 'test error 123',
              },
              target_version: '2.0.0',
            },
          ],
        } as any,
      });
      const badges = res.container.querySelectorAll('.euiBadge');
      expect(badges).toHaveLength(1);
      expect(res.queryByText('Update failed')).not.toBeNull();
    });
  });
});
