/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useEffect, useMemo, useRef } from 'react';

import type { EuiButtonGroupProps } from '@elastic/eui';
import { EuiButtonGroup } from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { useUrlState } from '@kbn/ml-url-state';

import type { ExplorerJob } from '../../explorer/explorer_utils';
import type { MlSummaryJob } from '../../../../common/types/anomaly_detection_jobs';
import { useMlLocator, useNavigateToPath } from '../../contexts/kibana';
import { ML_PAGES } from '../../../../common/constants/locator';

interface Props {
  viewId: typeof ML_PAGES.SINGLE_METRIC_VIEWER | typeof ML_PAGES.ANOMALY_EXPLORER;
  selectedJobs?: ExplorerJob[] | MlSummaryJob[] | null;
}

/**
 * Component for rendering a set of buttons for switching between the Anomaly Detection results views.
 */
export const AnomalyResultsViewSelector: FC<Props> = ({ viewId, selectedJobs }) => {
  const mounted = useRef(false);
  const locator = useMlLocator()!;
  const navigateToPath = useNavigateToPath();

  const smvJobs = (selectedJobs ?? []).filter((job) => job.isSingleMetricViewerJob);
  const isSingleMetricViewerDisabled = smvJobs.length === 0;

  const toggleButtonsIcons = useMemo<EuiButtonGroupProps['options']>(
    () => [
      {
        id: 'timeseriesexplorer',
        label:
          viewId === 'explorer' && isSingleMetricViewerDisabled
            ? i18n.translate(
                'xpack.ml.anomalyResultsViewSelector.singleMetricViewerDisabledLabel',
                {
                  defaultMessage:
                    'Selected {jobsCount, plural, one {job is} other {jobs are}} not viewable in the Single Metric Viewer',
                  values: {
                    jobsCount: selectedJobs?.length ?? 0,
                  },
                }
              )
            : i18n.translate('xpack.ml.anomalyResultsViewSelector.singleMetricViewerLabel', {
                defaultMessage: 'View results in the Single Metric Viewer',
              }),
        iconType: 'singleMetricViewer',
        value: ML_PAGES.SINGLE_METRIC_VIEWER,
        'data-test-subj': 'mlAnomalyResultsViewSelectorSingleMetricViewer',
        isDisabled: viewId === 'explorer' && isSingleMetricViewerDisabled,
      },
      {
        id: 'explorer',
        label: i18n.translate('xpack.ml.anomalyResultsViewSelector.anomalyExplorerLabel', {
          defaultMessage: 'View results in the Anomaly Explorer',
        }),
        iconType: 'visTable',
        value: ML_PAGES.ANOMALY_EXPLORER,
        'data-test-subj': 'mlAnomalyResultsViewSelectorExplorer',
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isSingleMetricViewerDisabled, selectedJobs?.length]
  );

  const [globalState] = useUrlState('_g');

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const onChangeView = async (newViewId: Props['viewId']) => {
    // Avoid calling and triggering a React state update on a possibly unmounted component
    if (mounted.current) {
      const url = await locator.getUrl({
        page: newViewId,
        pageState: {
          globalState,
        },
      });
      await navigateToPath(url);
    }
  };

  return (
    <EuiButtonGroup
      legend={i18n.translate('xpack.ml.anomalyResultsViewSelector.buttonGroupLegend', {
        defaultMessage: 'Anomaly results view selector',
      })}
      name="anomalyResultsViewSelector"
      data-test-subj="mlAnomalyResultsViewSelector"
      options={toggleButtonsIcons}
      idSelected={viewId}
      onChange={(newViewId: string) => onChangeView(newViewId as Props['viewId'])}
      isIconOnly
    />
  );
};
