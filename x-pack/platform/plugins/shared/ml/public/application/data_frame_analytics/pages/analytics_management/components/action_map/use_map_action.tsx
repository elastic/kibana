/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import { cloneDeep } from 'lodash';
import { i18n } from '@kbn/i18n';
import { useUrlState } from '@kbn/ml-url-state';
import { ML_PAGES } from '@kbn/ml-common-types/locator_ml_pages';
import {
  isRegressionAnalysis,
  isOutlierAnalysis,
  isClassificationAnalysis,
} from '@kbn/ml-data-frame-analytics-utils';
import { useMlLocator, useNavigateToPath } from '../../../../../contexts/kibana';
import type {
  DataFrameAnalyticsListAction,
  DataFrameAnalyticsListRow,
} from '../analytics_list/common';
import { getViewLinkStatus } from '../action_view/get_view_link_status';

export const mapActionButtonText = i18n.translate(
  'xpack.ml.dataframe.analyticsList.mapActionName',
  {
    defaultMessage: 'Map',
  }
);

const unknownAnalysisTypeMessage = i18n.translate(
  'xpack.ml.dataframe.analyticsList.mapActionDisabledTooltipContent',
  {
    defaultMessage: 'Unknown analysis type.',
  }
);

const isUnknownAnalysisType = ({ config }: DataFrameAnalyticsListRow) =>
  !isRegressionAnalysis(config.analysis) &&
  !isOutlierAnalysis(config.analysis) &&
  !isClassificationAnalysis(config.analysis);

export type MapAction = ReturnType<typeof useMapAction>;
export const useMapAction = () => {
  const mlLocator = useMlLocator()!;
  const navigateToPath = useNavigateToPath();

  const [globalState] = useUrlState('_g');

  const clickHandler = useCallback(
    async (item: DataFrameAnalyticsListRow) => {
      const globalStateClone = cloneDeep(globalState || {});
      delete globalStateClone.ml;

      const path = await mlLocator.getUrl({
        page: ML_PAGES.DATA_FRAME_ANALYTICS_MAP,
        pageState: {
          jobId: item.id,
          globalState: globalStateClone,
        },
      });

      await navigateToPath(path, false);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [globalState]
  );

  const action: DataFrameAnalyticsListAction = useMemo(
    () => ({
      isPrimary: true,
      name: mapActionButtonText,
      enabled: (item: DataFrameAnalyticsListRow) => !getViewLinkStatus(item).disabled,
      description: (item: DataFrameAnalyticsListRow) =>
        isUnknownAnalysisType(item) ? unknownAnalysisTypeMessage : mapActionButtonText,
      icon: 'graphApp',
      type: 'icon',
      onClick: clickHandler,
      'data-test-subj': 'mlAnalyticsJobMapButton',
    }),
    [clickHandler]
  );

  return { action };
};
