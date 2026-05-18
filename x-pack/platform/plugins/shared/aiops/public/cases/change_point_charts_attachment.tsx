/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { memoize } from 'lodash';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import React from 'react';
import type { UnifiedValueAttachmentViewProps } from '@kbn/cases-plugin/public/client/attachment_framework/types';
import { FIELD_FORMAT_IDS } from '@kbn/field-formats-plugin/common';
import type { TimeRange } from '@kbn/es-query';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiDescriptionList } from '@elastic/eui';
import deepEqual from 'fast-deep-equal';
import type { ChangePointChartEmbeddableState } from '@kbn/aiops-server-schemas/embeddables/change_point_chart';
import type {
  ChangePointDetectionProps,
  ChangePointDetectionSharedComponent,
} from '../shared_components/change_point_detection';

// Pre-9.5 case attachments stored these fields in camelCase.
interface LegacyAttachmentFields {
  timeRange?: TimeRange;
  viewType?: ChangePointChartEmbeddableState['view_type'];
  dataViewId?: string;
  fn?: ChangePointChartEmbeddableState['aggregation_function'];
  metricField?: string;
  splitField?: string;
  maxSeriesToPlot?: number;
}

type RawAttachmentState = Partial<ChangePointChartEmbeddableState> & LegacyAttachmentFields;

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

        const rawState = props.data.state as RawAttachmentState;
        const inputProps = {
          timeRange: rawState.time_range ?? rawState.timeRange,
          viewType: rawState.view_type ?? rawState.viewType,
          dataViewId: rawState.data_view_id ?? rawState.dataViewId,
          fn: rawState.aggregation_function ?? rawState.fn,
          metricField: rawState.metric_field ?? rawState.metricField,
          splitField: rawState.split_field ?? rawState.splitField,
          partitions: rawState.partitions,
          maxSeriesToPlot: rawState.max_series_to_plot ?? rawState.maxSeriesToPlot,
        } as ChangePointDetectionProps;

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
