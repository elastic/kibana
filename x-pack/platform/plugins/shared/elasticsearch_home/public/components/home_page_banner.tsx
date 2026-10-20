/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiIllustration, EuiLoadingSpinner, EuiSpacer } from '@elastic/eui';
import { cloudRocketDeploy } from '@elastic/eui-illustrations';
import { AnnouncementBanner } from '@kbn/announcement-banner';
import { useHomeConfig, useStorageKey, useTelemetryId } from '../context';
import { useLocalStorage } from '../hooks/use_local_storage';

const BANNER_DISMISSED_KEY_SUFFIX = 'banner.dismissed';

interface HomePageBannerProps {
  hasData: boolean;
  isLoading: boolean;
}

export const HomePageBanner = ({ hasData, isLoading }: HomePageBannerProps) => {
  const { banner } = useHomeConfig();
  const getStorageKey = useStorageKey();
  const getTelemetryId = useTelemetryId();
  const [isDismissed, setIsDismissed] = useLocalStorage<boolean>(
    getStorageKey(BANNER_DISMISSED_KEY_SUFFIX),
    false
  );

  const handleDismiss = useCallback(() => {
    setIsDismissed(true);
  }, [setIsDismissed]);

  if (!banner) {
    return null;
  }

  if (isLoading) {
    return (
      <>
        <EuiSpacer size="xxl" />
        <EuiLoadingSpinner size="m" />
      </>
    );
  }

  if (hasData || isDismissed) {
    return null;
  }

  return (
    <>
      <EuiSpacer size="xxl" />
      <AnnouncementBanner
        data-test-subj="elasticsearchHomeBanner"
        title={banner.title}
        text={banner.description}
        media={<EuiIllustration type={cloudRocketDeploy} alt="" />}
        color="highlighted"
        onDismiss={handleDismiss}
        dismissButtonProps={{ 'data-telemetry-id': getTelemetryId('banner-dismiss') }}
        actionProps={{
          primary: {
            children: banner.buttonLabel,
            fill: true,
            iconType: 'rocket',
            onClick: banner.onGetStarted,
            'data-test-subj': 'elasticsearchHomeBannerGetStartedBtn',
            'data-telemetry-id': getTelemetryId('getStartedBtn'),
          },
        }}
      />
    </>
  );
};
