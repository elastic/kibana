/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useCallback, useEffect, useRef } from 'react';
import type { Filter, Query, TimeRange } from '@kbn/es-query';
import { useCommonChartProps } from './use_common_chart_props';
import { useAiopsAppContext } from '../../hooks/use_aiops_app_context';
import type { ChangePointAnnotation, FieldConfig } from './change_point_detection_context';

export interface ChartComponentProps {
  fieldConfig: FieldConfig;
  annotation: ChangePointAnnotation;

  interval: string;

  onLoading?: (isLoading: boolean) => void;
  onRenderComplete?: () => void;
}

export interface ChartComponentPropsAll {
  fn: string;
  metricField: string;
  splitField?: string;
  maxResults: number;
  timeRange: TimeRange;
  filters?: Filter[];
  query?: Query;
}

export const ChartComponent: FC<ChartComponentProps> = React.memo(
  ({ annotation, fieldConfig, interval, onLoading, onRenderComplete }) => {
    const {
      lens: { EmbeddableComponent },
    } = useAiopsAppContext();

    const chartWrapperRef = useRef<HTMLDivElement>(null);

    const renderCompleteListener = useCallback(
      (event: Event) => {
        if (event.target === chartWrapperRef.current) return;
        if (onRenderComplete) {
          onRenderComplete();
        }
      },
      [onRenderComplete]
    );

    useEffect(() => {
      if (!chartWrapperRef.current) {
        throw new Error('Reference to the chart wrapper is not set');
      }
      const chartWrapper = chartWrapperRef.current;
      chartWrapper.addEventListener('renderComplete', renderCompleteListener);
      return () => {
        chartWrapper.removeEventListener('renderComplete', renderCompleteListener);
      };
    }, [renderCompleteListener]);

    const { filters, timeRange, query, attributes } = useCommonChartProps({
      fieldConfig,
      annotation,
      bucketInterval: interval,
    });

    return (
      <div ref={chartWrapperRef}>
        <EmbeddableComponent
          id={`changePointChart_${annotation.group ? annotation.group.value : annotation.label}`}
          style={{ height: 350 }}
          timeRange={timeRange}
          query={query}
          filters={filters}
          // @ts-ignore
          attributes={attributes}
          renderMode={'view'}
          executionContext={{
            type: 'aiops_change_point_detection_chart',
            name: 'Change point detection',
          }}
          disableTriggers
          onLoad={onLoading}
        />
      </div>
    );
  }
);
