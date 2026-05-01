/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { memoize } from 'lodash';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { UnifiedValueAttachmentViewProps } from '@kbn/cases-plugin/public/client/attachment_framework/types';
import { FIELD_FORMAT_IDS } from '@kbn/field-formats-plugin/common';
import type { TimeRange } from '@kbn/es-query';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiDescriptionList } from '@elastic/eui';
import type {
  LogRateAnalysisEmbeddableWrapper,
  LogRateAnalysisEmbeddableWrapperProps,
} from '../shared_components/log_rate_analysis_embeddable_wrapper';

export const initComponent = memoize(
  (fieldFormats: FieldFormatsStart, LogRateAnalysisComponent: LogRateAnalysisEmbeddableWrapper) => {
    return React.memo((props: UnifiedValueAttachmentViewProps) => {
      const rawState = props.data.state as Record<string, unknown>;
      const dataFormatter = fieldFormats.deserialize({
        id: FIELD_FORMAT_IDS.DATE,
      });
      const timeRange = (rawState.time_range ?? rawState.timeRange) as TimeRange;
      const inputProps = {
        ...(rawState as unknown as LogRateAnalysisEmbeddableWrapperProps),
        timeRange,
      };

      const listItems = [
        {
          title: (
            <FormattedMessage
              id="xpack.aiops.logRateAnalysis.cases.timeRangeLabel"
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
          <LogRateAnalysisComponent {...inputProps} embeddingOrigin={'cases'} />
        </>
      );
    });
  }
);
