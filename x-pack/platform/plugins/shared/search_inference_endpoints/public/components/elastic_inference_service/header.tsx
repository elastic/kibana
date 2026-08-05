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
import { useKibana } from '../../hooks/use_kibana';
import { useInferenceCapabilities } from '../../hooks/use_inference_capabilities';

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

  const showManageRegions = canManage;

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
        ...(showManageRegions
          ? [
              {
                id: 'manageRegions',
                label: i18n.translate(
                  'xpack.searchInferenceEndpoints.eisModelsPage.manageRegionsButton',
                  { defaultMessage: 'Manage regions' }
                ),
                iconType: 'gear' as const,
                run: onManageRegions,
                testId: 'eisManageRegionsButton',
              },
            ]
          : []),
      ],
    }),
    [billingUrl, cloud?.isCloudEnabled, onManageRegions, showManageRegions]
  );

  return (
    <AppHeader
      title={i18n.translate('xpack.searchInferenceEndpoints.eisModelsPage.header', {
        defaultMessage: 'Elastic Inference Service',
      })}
      description={i18n.translate('xpack.searchInferenceEndpoints.eisModelsPage.description', {
        defaultMessage: 'Manage models and endpoints for Elastic Inference Service',
      })}
      menu={menu}
      docLink={docLinks.elasticInferenceService}
      spacing="bleed"
    />
  );
};
