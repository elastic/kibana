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

import type { DynamicPagePathValues } from '../../../../constants';

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

    it('should set isDeprecated to true when item title contains "deprecated"', () => {
      const cardItem = mapToCard({
        item: {
          id: 'old-package',
          name: 'old-package',
          title: 'Old Package (Deprecated)',
          version: '1.0.0',
          type: 'integration',
        },
        addBasePath,
        getHref,
      } as any);

      expect(cardItem).toMatchObject({ isDeprecated: true });
    });

    it('should set isDeprecated to true when item description contains "deprecated"', () => {
      const cardItem = mapToCard({
        item: {
          id: 'old-package',
          name: 'old-package',
          title: 'Old Package',
          description: 'This integration is deprecated, use new-package instead',
          version: '1.0.0',
          type: 'integration',
        },
        addBasePath,
        getHref,
      } as any);

      expect(cardItem).toMatchObject({ isDeprecated: true });
    });

    it('should set isDeprecated to true when item name contains "deprecated"', () => {
      const cardItem = mapToCard({
        item: {
          id: 'deprecated-package',
          name: 'deprecated-package',
          title: 'Old Package',
          version: '1.0.0',
          type: 'integration',
        },
        addBasePath,
        getHref,
      } as any);

      expect(cardItem).toMatchObject({ isDeprecated: true });
    });

    it('should derive signalTypes from data_streams for integration packages', () => {
      const cardItem = mapToCard({
        item: {
          id: 'nginx',
          name: 'nginx',
          version: '1.0.0',
          type: 'integration',
          data_streams: [{ type: 'logs' }, { type: 'metrics' }, { type: 'logs' }],
        },
        addBasePath,
        getHref,
      } as any);

      expect(cardItem.signalTypes).toEqual(['logs', 'metrics']);
    });

    it('should match all signal types for input packages', () => {
      // The EPR search response strips the policy template type/dynamic_signal_types,
      // so input packages match every signal filter regardless of template fields.
      const cardItem = mapToCard({
        item: {
          id: 'nginx_otel_input',
          name: 'nginx_otel_input',
          version: '1.0.0',
          type: 'input',
          policy_templates: [
            {
              name: 'nginxreceiver',
              title: 'NGINX OpenTelemetry Input',
              description: 'Collect NGINX metrics using OpenTelemetry Collector',
            },
          ],
        },
        addBasePath,
        getHref,
      } as any);

      expect(cardItem.signalTypes).toEqual(['logs', 'metrics', 'traces']);
    });

    describe('when enableIntegrationTileClickToAdd is enabled', () => {
      beforeEach(() => {
        ExperimentalFeaturesService.init({
          enableIntegrationTileClickToAdd: true,
        } as any);
      });

      it('should route to the overview page when the user cannot add integrations', () => {
        const cardItem = mapToCard({
          item: {
            id: 'okta',
            name: 'okta',
            version: '1.0.0',
            type: 'integration',
            data_streams: [{ type: 'logs' }],
          },
          addBasePath,
          getHref,
          canAddIntegration: false,
        } as any);

        expect(cardItem.url).toBe('integration_details_overview');
      });

      it('should route integration packages to the add-integration page', () => {
        const cardItem = mapToCard({
          item: {
            id: 'okta',
            name: 'okta',
            version: '1.0.0',
            type: 'integration',
            data_streams: [{ type: 'logs' }],
          },
          addBasePath,
          getHref,
        } as any);

        expect(cardItem.url).toBe('add_integration_to_policy');
      });

      it('should route integration packages with policy templates and no data streams to the add-integration page', () => {
        const cardItem = mapToCard({
          item: {
            id: 'apm',
            name: 'apm',
            version: '1.0.0',
            type: 'integration',
            policy_templates: [{ name: 'apmserver' }],
          },
          addBasePath,
          getHref,
        } as any);

        expect(cardItem.url).toBe('add_integration_to_policy');
      });

      it('should use the classification carried by catalog tiles', () => {
        // Catalog tiles have `policy_templates` stripped, so the classification is precomputed.
        const addable = mapToCard({
          item: {
            id: 'apm',
            name: 'apm',
            version: '1.0.0',
            type: 'integration',
            addIntegrationFromCatalog: true,
          },
          addBasePath,
          getHref,
        } as any);
        const notAddable = mapToCard({
          item: {
            id: 'corelight',
            name: 'corelight',
            version: '1.0.0',
            type: 'integration',
            data_streams: [{ type: 'logs' }],
            addIntegrationFromCatalog: false,
          },
          addBasePath,
          getHref,
        } as any);

        expect(addable.url).toBe('add_integration_to_policy');
        expect(notAddable.url).toBe('integration_details_overview');
      });

      it('should route integration packages without data streams or policy templates to the overview page', () => {
        const cardItem = mapToCard({
          item: { id: 'corelight', name: 'corelight', version: '1.0.0', type: 'integration' },
          addBasePath,
          getHref,
        } as any);

        expect(cardItem.url).toBe('integration_details_overview');
      });

      it('should route supabase to the overview page even though it has data streams', () => {
        const cardItem = mapToCard({
          item: {
            id: 'supabase',
            name: 'supabase',
            version: '1.0.0',
            type: 'integration',
            data_streams: [{ type: 'metrics' }],
          },
          addBasePath,
          getHref,
        } as any);

        expect(cardItem.url).toBe('integration_details_overview');
      });

      it('should route uploaded packages with data streams to the add-integration page', () => {
        const cardItem = mapToCard({
          item: {
            id: 'my_upload',
            name: 'my_upload',
            version: '1.0.0',
            type: 'integration',
            data_streams: [{ type: 'logs' }],
            installationInfo: { version: '1.0.0', install_source: 'upload' },
          },
          addBasePath,
          getHref,
        } as any);

        expect(cardItem.url).toBe('add_integration_to_policy');
      });

      it('should route uploaded packages without data streams or policy templates to the overview page', () => {
        const cardItem = mapToCard({
          item: {
            id: 'my_upload',
            name: 'my_upload',
            version: '1.0.0',
            type: 'integration',
            installationInfo: { version: '1.0.0', install_source: 'upload' },
          },
          addBasePath,
          getHref,
        } as any);

        expect(cardItem.url).toBe('integration_details_overview');
      });

      it('should route uploaded packages with only saved object attributes to the add-integration page', () => {
        const cardItem = mapToCard({
          item: {
            id: 'my_upload',
            name: 'my_upload',
            version: '1.0.0',
            installationInfo: { version: '1.0.0', install_source: 'upload' },
          },
          addBasePath,
          getHref,
        } as any);

        expect(cardItem.url).toBe('add_integration_to_policy');
      });

      it('should route input packages to the add-integration page', () => {
        const cardItem = mapToCard({
          item: {
            id: 'nginx_otel_input',
            name: 'nginx_otel_input',
            version: '1.0.0',
            type: 'input',
          },
          addBasePath,
          getHref,
        } as any);

        expect(cardItem.url).toBe('add_integration_to_policy');
      });

      it('should still route content packages to the overview page', () => {
        const cardItem = mapToCard({
          item: { id: 'sample_content', name: 'sample_content', version: '1.0.0', type: 'content' },
          addBasePath,
          getHref,
        } as any);

        expect(cardItem.url).toBe('integration_details_overview');
      });
    });

    describe('when enableIntegrationTileClickToAdd is disabled', () => {
      it('should route integration packages to the overview page', () => {
        const cardItem = mapToCard({
          item: { id: 'okta', name: 'okta', version: '1.0.0', type: 'integration' },
          addBasePath,
          getHref,
        } as any);

        expect(cardItem.url).toBe('integration_details_overview');
      });

      it('should route input packages to the overview page', () => {
        const cardItem = mapToCard({
          item: {
            id: 'nginx_otel_input',
            name: 'nginx_otel_input',
            version: '1.0.0',
            type: 'input',
          },
          addBasePath,
          getHref,
        } as any);

        expect(cardItem.url).toBe('integration_details_overview');
      });

      it('should route content packages to the overview page', () => {
        const cardItem = mapToCard({
          item: { id: 'sample_content', name: 'sample_content', version: '1.0.0', type: 'content' },
          addBasePath,
          getHref,
        } as any);

        expect(cardItem.url).toBe('integration_details_overview');
      });

      it('should route integration packages with data streams to the overview page', () => {
        const cardItem = mapToCard({
          item: {
            id: 'okta',
            name: 'okta',
            version: '1.0.0',
            type: 'integration',
            data_streams: [{ type: 'logs' }],
          },
          addBasePath,
          getHref,
        } as any);

        expect(cardItem.url).toBe('integration_details_overview');
      });

      it('should route integration packages with policy templates and no data streams to the overview page', () => {
        const cardItem = mapToCard({
          item: {
            id: 'apm',
            name: 'apm',
            version: '1.0.0',
            type: 'integration',
            policy_templates: [{ name: 'apmserver' }],
          },
          addBasePath,
          getHref,
        } as any);

        expect(cardItem.url).toBe('integration_details_overview');
      });

      it('should route integration packages without data streams or policy templates to the overview page', () => {
        const cardItem = mapToCard({
          item: { id: 'corelight', name: 'corelight', version: '1.0.0', type: 'integration' },
          addBasePath,
          getHref,
        } as any);

        expect(cardItem.url).toBe('integration_details_overview');
      });

      it('should route supabase to the overview page', () => {
        const cardItem = mapToCard({
          item: {
            id: 'supabase',
            name: 'supabase',
            version: '1.0.0',
            type: 'integration',
            data_streams: [{ type: 'metrics' }],
          },
          addBasePath,
          getHref,
        } as any);

        expect(cardItem.url).toBe('integration_details_overview');
      });

      it('should route uploaded packages to the overview page', () => {
        const cardItem = mapToCard({
          item: {
            id: 'my_upload',
            name: 'my_upload',
            version: '1.0.0',
            type: 'integration',
            data_streams: [{ type: 'logs' }],
            installationInfo: { version: '1.0.0', install_source: 'upload' },
          },
          addBasePath,
          getHref,
        } as any);

        expect(cardItem.url).toBe('integration_details_overview');
      });

      it('should route uploaded packages with only saved object attributes to the overview page', () => {
        const cardItem = mapToCard({
          item: {
            id: 'my_upload',
            name: 'my_upload',
            version: '1.0.0',
            installationInfo: { version: '1.0.0', install_source: 'upload' },
          },
          addBasePath,
          getHref,
        } as any);

        expect(cardItem.url).toBe('integration_details_overview');
      });
    });

    it('does not put return params on package card hrefs', () => {
      const getHrefWithValues: Parameters<typeof mapToCard>[0]['getHref'] = jest.fn(
        (_page: string, values?: DynamicPagePathValues) =>
          `integration_details_overview?${new URLSearchParams(
            Object.entries(values ?? {}).map(([key, value]) => [key, String(value)])
          ).toString()}`
      );
      const cardArgs = Object.assign(
        {
          item: {
            id: 'nginx',
            name: 'nginx',
            title: 'Nginx',
            version: '1.0.0',
            type: 'integration',
          } as PackageListItem,
          addBasePath,
          getHref: getHrefWithValues,
          getAbsolutePath: (p: string) => p,
        },
        {
          returnAppId: 'observabilityOnboarding',
          returnPath: '?',
        } as Record<string, string>
      );
      const cardItem = mapToCard(cardArgs);

      expect(getHrefWithValues).toHaveBeenCalledWith('integration_details_overview', {
        pkgkey: 'nginx-1.0.0',
      });
      expect(cardItem.url).not.toContain('returnAppId');
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
