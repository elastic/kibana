/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useRef } from 'react';
import moment from 'moment';
import type { KibanaReactOverlays } from '@kbn/kibana-react-plugin/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { useStorage } from '@kbn/ml-local-storage';
import { ML_APPLY_TIME_RANGE_CONFIG } from '../../../../common/types/storage';
import { useMlKibana } from '../kibana';
import {
  JobSelectorFlyoutContent,
  type JobSelectionResult,
} from '../../components/job_selector/job_selector_flyout';

export type GetJobSelection = ReturnType<typeof useJobSelectionFlyout>;

/**
 * Hook for invoking Anomaly Detection jobs selection
 * inside the ML app.
 */
export function useJobSelectionFlyout() {
  const { overlays, services } = useMlKibana();
  const [applyTimeRangeConfig, setApplyTimeRangeConfig] = useStorage(
    ML_APPLY_TIME_RANGE_CONFIG,
    true
  );

  const flyoutRef = useRef<ReturnType<KibanaReactOverlays['openFlyout']>>();

  useEffect(function closeFlyoutOnLeave() {
    return () => {
      if (flyoutRef.current) {
        flyoutRef.current.close();
      }
    };
  }, []);

  return useCallback(
    (
      config: {
        singleSelection?: boolean;
        withTimeRangeSelector?: boolean;
        timeseriesOnly?: boolean;
        selectedIds?: string[];
      } = {
        singleSelection: false,
        withTimeRangeSelector: true,
        timeseriesOnly: false,
        selectedIds: [],
      }
    ): Promise<JobSelectionResult> => {
      const { uiSettings } = services;

      const tzConfig = uiSettings.get('dateFormat:tz');
      const dateFormatTz = tzConfig !== 'Browser' ? tzConfig : moment.tz.guess();

      return new Promise(async (resolve, reject) => {
        try {
          flyoutRef.current = overlays.openFlyout(
            <KibanaContextProvider services={services}>
              <JobSelectorFlyoutContent
                selectedIds={config.selectedIds}
                withTimeRangeSelector={config.withTimeRangeSelector}
                applyTimeRangeConfig={applyTimeRangeConfig}
                onTimeRangeConfigChange={setApplyTimeRangeConfig}
                dateFormatTz={dateFormatTz}
                singleSelection={!!config.singleSelection}
                timeseriesOnly={!!config.timeseriesOnly}
                onFlyoutClose={() => {
                  reject();
                  flyoutRef.current!.close();
                }}
                onSelectionConfirmed={(payload) => {
                  resolve(payload);
                  flyoutRef.current!.close();
                }}
              />
            </KibanaContextProvider>
          );
        } catch (error) {
          reject(error);
        }
      });
    },
    [services, overlays, applyTimeRangeConfig, setApplyTimeRangeConfig]
  );
}
