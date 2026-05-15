/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { memoize, omit } from 'lodash';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import React from 'react';
import type { UnifiedValueAttachmentViewProps } from '@kbn/cases-plugin/public/client/attachment_framework/types';
import { FIELD_FORMAT_IDS } from '@kbn/field-formats-plugin/common';
import type { TimeRange } from '@kbn/es-query';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiDescriptionList } from '@elastic/eui';
import deepEqual from 'fast-deep-equal';
import type {
  ChangePointDetectionProps,
  ChangePointDetectionSharedComponent,
} from '../shared_components/change_point_detection';

export const initComponent = memoize(
  (
    fieldFormats: FieldFormatsStart,
    ChangePointDetectionComponent: ChangePointDetectionSharedComponent
  ) => {
    return React.memo(
      (props: UnifiedValueAttachmentViewProps) => {
        const dataFormatter = fieldFormats.deserialize({
          id: FIELD_FORMAT_IDS.DATE,
        });

        const rawState = props.data.state as Record<string, unknown>;
        const timeRange = (rawState.time_range ?? rawState.timeRange) as TimeRange;
        const rawUiState = omit(rawState, [
          'aggregation_function',
          'data_view_id',
          'max_series_to_plot',
          'metric_field',
          'split_field',
          'time_range',
          'view_type',
        ]);
        const inputProps: ChangePointDetectionProps = {
          ...(rawUiState as unknown as ChangePointDetectionProps),
          viewType: (rawState.view_type ??
            rawState.viewType) as ChangePointDetectionProps['viewType'],
          dataViewId: (rawState.data_view_id ?? rawState.dataViewId) as string,
          fn: (rawState.aggregation_function ?? rawState.fn) as ChangePointDetectionProps['fn'],
          metricField: (rawState.metric_field ?? rawState.metricField) as string,
          splitField: (rawState.split_field ?? rawState.splitField) as string | undefined,
          maxSeriesToPlot: (rawState.max_series_to_plot ?? rawState.maxSeriesToPlot) as
            | number
            | undefined,
          timeRange,
        };

        const listItems = [
          {
            title: (
              <FormattedMessage
                id="xpack.aiops.changePointDetection.cases.timeRangeLabel"
                defaultMessage="Time range"
              />
            ),
            description: `${dataFormatter.convert(
              inputProps.timeRange.from
            )} - ${dataFormatter.convert(inputProps.timeRange.to)}`,
          },
        ];

        return (
          <>
            <EuiDescriptionList compressed type={'inline'} listItems={listItems} />
            <ChangePointDetectionComponent {...inputProps} embeddingOrigin={'cases'} />
          </>
        );
      },
      (prevProps, nextProps) => deepEqual(prevProps.data.state, nextProps.data.state)
    );
  }
);
