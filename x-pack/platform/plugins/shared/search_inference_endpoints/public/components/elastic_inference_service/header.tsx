/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { AppHeader } from '@kbn/app-header';
import type { AppHeaderMenu } from '@kbn/app-header';
import { i18n } from '@kbn/i18n';
import { docLinks } from '../../../common/doc_links';
import type { EisInferenceEndpoint } from '../../../common/types';
import { useEisModels } from '../../hooks/use_eis_models';
import { useInferenceCapabilities } from '../../hooks/use_inference_capabilities';
import { useKibana } from '../../hooks/use_kibana';
import { useRegionPolicy } from '../../hooks/use_region_policy';
import { RestrictedRegionsBadge } from './restricted_regions_badge';

const EMPTY_ENDPOINTS: EisInferenceEndpoint[] = [];

interface ElasticInferenceServiceModelsHeaderProps {
  onManageRegions: () => void;
}

export const ElasticInferenceServiceModelsHeader = ({
  onManageRegions,
}: ElasticInferenceServiceModelsHeaderProps) => {
  const {
    services: { cloud },
  } = useKibana();
  const { canManage } = useInferenceCapabilities();
  const { data: regionPolicy } = useRegionPolicy();
  const { data: eisEndpoints } = useEisModels();

  const [billingUrl, setBillingUrl] = useState<string>();

  useEffect(() => {
    if (cloud?.isCloudEnabled && cloud?.getPrivilegedUrls) {
      cloud.getPrivilegedUrls().then((urls) => {
        if (urls.billingUrl) {
          setBillingUrl(urls.billingUrl);
        }
      });
    }
  }, [cloud]);

  const menu = useMemo<AppHeaderMenu>(
    () => ({
      items: [
        ...(cloud?.isCloudEnabled && billingUrl
          ? [
              {
                id: 'viewCloudUsage',
                label: i18n.translate(
                  'xpack.searchInferenceEndpoints.eisModelsPage.cloudUsage.button',
                  { defaultMessage: 'View Cloud usage' }
                ),
                iconType: 'external' as const,
                href: billingUrl,
                target: '_blank',
                testId:
                  'searchInferenceEndpointsElasticInferenceServiceModelsHeaderViewCloudUsageButton',
              },
            ]
          : []),
        ...(canManage
          ? [
              {
                id: 'manageRegions',
                label: i18n.translate(
                  'xpack.searchInferenceEndpoints.eisModelsPage.manageRegionsButton',
                  { defaultMessage: 'Region preferences' }
                ),
                iconType: 'gear' as const,
                run: onManageRegions,
                testId: 'eisManageRegionsButton',
              },
            ]
          : []),
      ],
    }),
    [billingUrl, canManage, cloud?.isCloudEnabled, onManageRegions]
  );

  const badges = useMemo(() => {
    if (!regionPolicy) {
      return undefined;
    }
    const hasAllowedGeos = (regionPolicy.region_policy.allowed_geos?.length ?? 0) > 0;
    const hasAllowedRegions = (regionPolicy.region_policy.allowed_regions?.length ?? 0) > 0;
    if (!hasAllowedGeos && !hasAllowedRegions) {
      return undefined;
    }

    return [
      {
        label: i18n.translate(
          'xpack.searchInferenceEndpoints.eisModelsPage.restrictedRegionsBadgeLabel',
          { defaultMessage: 'Restricted regions' }
        ),
        color: 'warning' as const,
        renderCustomBadge: () => (
          <RestrictedRegionsBadge
            policy={regionPolicy}
            endpoints={eisEndpoints ?? EMPTY_ENDPOINTS}
            onManageRegions={canManage ? onManageRegions : undefined}
          />
        ),
      },
    ];
  }, [canManage, eisEndpoints, onManageRegions, regionPolicy]);

  return (
    <AppHeader
      title={i18n.translate('xpack.searchInferenceEndpoints.eisModelsPage.header', {
        defaultMessage: 'Elastic Inference Service',
      })}
      description={i18n.translate('xpack.searchInferenceEndpoints.eisModelsPage.description', {
        defaultMessage: 'Manage models and endpoints for Elastic Inference Service',
      })}
      badges={badges}
      menu={menu}
      docLink={docLinks.elasticInferenceService}
      spacing="bleed"
    />
  );
};
