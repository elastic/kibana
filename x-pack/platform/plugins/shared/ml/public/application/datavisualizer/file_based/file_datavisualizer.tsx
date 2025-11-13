/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { Fragment, useState, useEffect, useMemo, useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
// import { getFieldsStatsGrid } from '@kbn/data-visualizer-plugin/public';
import { useTimefilter } from '@kbn/ml-date-picker';

import type { ResultLinks } from '@kbn/file-upload-common';
import type { GetAdditionalLinks, GetAdditionalLinksParams } from '@kbn/file-upload';
import { FileDataVisualizerWrapper } from '@kbn/file-upload';

// import type { FileDataVisualizerSpec } from '@kbn/file-upload/src/file_upload_component';

import { HelpMenu } from '../../components/help_menu';
import {
  useMlApi,
  useMlKibana,
  useMlLocator,
  useMlManagementLocatorInternal,
} from '../../contexts/kibana';

import { ML_PAGES } from '../../../../common/constants/locator';
import { isFullLicense } from '../../license';
import { mlNodesAvailable, getMlNodeCount } from '../../ml_nodes_check/check_ml_nodes';
import { checkPermission } from '../../capabilities/check_capabilities';
import { MlPageHeader } from '../../components/page_header';
import { PageTitle } from '../../components/page_title';

export const FileDataVisualizerPage: FC = () => {
  useTimefilter({ timeRangeSelector: false, autoRefreshSelector: false });
  const { services } = useMlKibana();
  const {
    docLinks,
    dataVisualizer,
    data: {
      dataViews: { get: getDataView },
    },
  } = services;
  const mlApi = useMlApi();
  const mlLocator = useMlLocator()!;
  const mlManagementLocator = useMlManagementLocatorInternal();
  getMlNodeCount(mlApi);

  const getDependencies = useCallback(
    async () => ({
      analytics: services.analytics,
      application: services.application,
      data: services.data,
      fieldFormats: services.fieldFormats,
      fileUpload: services.fileUpload,
      http: services.http,
      notifications: services.notifications,
      share: services.share,
      uiActions: services.uiActions,
      uiSettings: services.uiSettings,
      coreStart: {
        analytics: services.analytics,
        application: services.application,
        chrome: services.chrome,
        customBranding: services.customBranding,
        docLinks: services.docLinks,
        executionContext: services.executionContext,
        featureFlags: services.featureFlags,
        http: services.http,
        injection: services.injection,
        i18n: services.i18n,
        notifications: services.notifications,
        overlays: services.overlays,
        uiSettings: services.uiSettings,
        settings: services.settings,
        fatalErrors: services.fatalErrors,
        deprecations: services.deprecations,
        theme: services.theme,
        plugins: services.plugins,
        pricing: services.pricing,
        security: services.security,
        userProfile: services.userProfile,
        rendering: services.rendering,
      },
    }),
    [services]
  );

  // const [FileDataVisualizer, setFileDataVisualizer] = useState<FileDataVisualizerSpec | null>(null);
  // resultLinks is for filebeat !!!!!!!!!!!!!!!
  const [resultLinks, setResultLinks] = useState<ResultLinks | null>(null);

  const getAdditionalLinks: GetAdditionalLinks = useMemo(
    () => [
      async ({ dataViewId, globalState }: GetAdditionalLinksParams) => [
        {
          id: 'create_ml_job',
          title: i18n.translate('xpack.ml.fileDatavisualizer.actionsPanel.anomalyDetectionTitle', {
            defaultMessage: 'Create ML job',
          }),
          description: '',
          icon: 'machineLearningApp',
          type: 'file',
          getUrl: async () => {
            return (
              await mlManagementLocator.getUrl({
                page: ML_PAGES.ANOMALY_DETECTION_CREATE_JOB_SELECT_TYPE,
                pageState: {
                  index: dataViewId,
                  globalState,
                },
              })
            ).url!;
          },
          canDisplay: async () => {
            try {
              const { timeFieldName } = await getDataView(dataViewId);
              return (
                isFullLicense() &&
                timeFieldName !== undefined &&
                checkPermission('canCreateJob') &&
                mlNodesAvailable()
              );
            } catch (error) {
              return false;
            }
          },
        },
        {
          id: 'open_in_data_viz',
          title: i18n.translate('xpack.ml.fileDatavisualizer.actionsPanel.dataframeTitle', {
            defaultMessage: 'Open in Data Visualizer',
          }),
          description: '',
          icon: 'dataVisualizer',
          type: 'file',
          getUrl: async () => {
            return await mlLocator.getUrl({
              page: ML_PAGES.DATA_VISUALIZER_INDEX_VIEWER,
              pageState: {
                index: dataViewId,
                globalState,
              },
            });
          },
          canDisplay: async () => dataViewId !== '',
        },
      ],
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mlLocator]
  );

  useEffect(() => {
    // ML uses this function
    if (dataVisualizer !== undefined) {
      getMlNodeCount(mlApi);
      // const { getFileDataVisualizerComponent } = dataVisualizer;
      // getFileDataVisualizerComponent().then((resp) => {
      //   const items = resp();
      //   setFileDataVisualizer(() => items.component);
      //   setResultLinks(items.resultLinks);
      // });

      // const gg = getFileDataVisualizerWrapper(
      //   async () => ({
      //     analytics: services.analytics,
      //     application: services.application,
      //     data: services.data,
      //     fieldFormats: services.fieldFormats,
      //     fileUpload: services.fileUpload,
      //     http: services.http,
      //     notifications: services.notifications,
      //     share: services.share,
      //     uiActions: services.uiActions,
      //   }),
      //   'data-visualizer-file-page',
      //   undefined,
      //   getFieldsStatsGrid
      // );
      // setFileDataVisualizer(() => gg as unknown as FileDataVisualizerSpec);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Fragment>
      <>
        <MlPageHeader>
          <PageTitle
            title={
              <FormattedMessage
                id="xpack.ml.dataVisualizer.pageHeader"
                defaultMessage="Data Visualizer"
              />
            }
          />
        </MlPageHeader>
        <FileDataVisualizerWrapper
          getDependencies={getDependencies}
          location={'ml-file-data-visualizer'}
          getAdditionalLinks={getAdditionalLinks}
          resultLinks={resultLinks ?? undefined}
        />
      </>

      <HelpMenu docLink={docLinks.links.ml.guide} />
    </Fragment>
  );
};
