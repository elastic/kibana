/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import type { ExportShare } from '@kbn/share-plugin/public';
import { ContentSourceLoader } from '@kbn/content-management-content-source';
import { deburr, kebabCase } from 'lodash';
import { LensSharingData } from './types';

export const registerJsonExportIntegration = (): ExportShare => {
  return {
    id: 'jsonDownloadLens',
    shareType: 'integration',
    groupId: 'export',
    config: ({ sharingData }) => {
      const { title, getSerializedState } = sharingData as unknown as LensSharingData;

      return {
        name: i18n.translate('dashboard.shareIntegration.exportDashboardJsonTitle', {
          defaultMessage: 'JSON',
        }),
        icon: 'document',
        label: 'JSON',
        exportType: 'dashboardJson',
        renderCopyURIButton: true,
        generateAssetExport: async () => {
          // @ts-expect-error - untyped library
          const { saveAs } = await import('@elastic/filesaver');

          const json = getSerializedState();
          saveAs(
            new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' }),
            `${kebabCase(deburr(title))}.json`
          );
        },
        generateAssetComponent: (
          <ContentSourceLoader getContent={async () => getSerializedState()} />
        ),
      };
    },
  };
};
