/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty } from '@elastic/eui';
import type { DataQualityDetailsLocatorParams } from '@kbn/deeplinks-observability';
import { DATA_QUALITY_DETAILS_LOCATOR_ID } from '@kbn/deeplinks-observability';
import { getRouterLinkProps } from '@kbn/router-utils';
import type { BrowserUrlService } from '@kbn/share-plugin/public';
import React from 'react';
import type { TimeRangeConfig } from '../../../../common/types';

export const DatasetQualityDetailsLink = React.memo(
  ({
    urlService,
    dataStream,
    timeRange,
    children,
  }: {
    urlService: BrowserUrlService;
    dataStream: string;
    timeRange: TimeRangeConfig;
    children: React.ReactNode;
  }) => {
    const locator = urlService.locators.get<DataQualityDetailsLocatorParams>(
      DATA_QUALITY_DETAILS_LOCATOR_ID
    );
    const datasetQualityUrl = locator?.getRedirectUrl({ dataStream, timeRange });
    const navigateToDatasetQuality = () => {
      locator?.navigate({ dataStream, timeRange });
    };

    const datasetQualityLinkDetailsProps = getRouterLinkProps({
      href: datasetQualityUrl,
      onClick: navigateToDatasetQuality,
    });

    return (
      <EuiButtonEmpty
        {...datasetQualityLinkDetailsProps}
        color="primary"
        data-test-subj={`datasetQualityTableDetailsLink-${dataStream}`}
        target="_blank"
        size="xs"
        flush="both"
      >
        {children}
      </EuiButtonEmpty>
    );
  }
);
