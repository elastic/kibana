/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EisCloudConnectPromoCallout,
  EisPromotionalCallout,
  useCloudConnectStatus,
} from '@kbn/search-api-panels';
import { CLOUD_CONNECT_NAV_ID } from '@kbn/deeplinks-management/constants';

import { docLinks } from '../../../common/doc_links';
import { useKibana } from '../../hooks/use_kibana';

export const EisCallouts: React.FC = () => {
  const {
    services: { cloud, cloudConnect, application },
  } = useKibana();
  const { isLoading: isCloudConnectStatusLoading, isCloudConnected } = useCloudConnectStatus(
    cloudConnect?.hooks.useCloudConnectStatus
  );

  return (
    <>
      <EisPromotionalCallout
        promoId="inferenceEndpointManagement"
        isCloudEnabled={cloud?.isCloudEnabled ?? false}
        ctaLink={docLinks.elasticInferenceService}
        direction="row"
      />
      {!isCloudConnectStatusLoading && !isCloudConnected && (
        <EisCloudConnectPromoCallout
          promoId="inferenceEndpointManagement"
          isSelfManaged={!cloud?.isCloudEnabled}
          direction="row"
          navigateToApp={() =>
            application.navigateToApp(CLOUD_CONNECT_NAV_ID, { openInNewTab: true })
          }
        />
      )}
    </>
  );
};
