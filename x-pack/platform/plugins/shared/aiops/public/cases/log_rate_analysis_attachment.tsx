/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { memoize } from 'lodash';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { UnifiedValueAttachmentViewProps } from '@kbn/cases-plugin/public';
import { FIELD_FORMAT_IDS } from '@kbn/field-formats-plugin/common';
import type { TimeRange } from '@kbn/es-query';
import type { WindowParameters } from '@kbn/aiops-log-rate-analysis';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiDescriptionList } from '@elastic/eui';
import type { LogRateAnalysisAttachmentData } from '../../common/utils';
import {
  normalizeLogRateAnalysisLegacyFields,
  type RawLogRateAnalysisState,
} from '../../common/embeddables/log_rate_analysis/normalize_legacy_state';
import type {
  LogRateAnalysisEmbeddableWrapper,
  LogRateAnalysisEmbeddableWrapperProps,
} from '../shared_components/log_rate_analysis_embeddable_wrapper';

type LogRateAnalysisViewProps = UnifiedValueAttachmentViewProps<LogRateAnalysisAttachmentData>;

// Pre-9.5 case attachments stored time_range as timeRange and window_parameters as windowParameters.
type RawAttachmentState = RawLogRateAnalysisState & {
  timeRange?: TimeRange;
  windowParameters?: WindowParameters;
  window_parameters?: WindowParameters;
};

export const initComponent = memoize(
  (fieldFormats: FieldFormatsStart, LogRateAnalysisComponent: LogRateAnalysisEmbeddableWrapper) => {
    return React.memo((props: LogRateAnalysisViewProps) => {
      const dataFormatter = fieldFormats.deserialize({
        id: FIELD_FORMAT_IDS.DATE,
      });
      const rawState = props.data.state as RawAttachmentState;

      const normalized = normalizeLogRateAnalysisLegacyFields(rawState);
      const inputProps = {
        dataViewId: normalized.data_view_id,
        timeRange: rawState.time_range ?? rawState.timeRange,
        windowParameters: rawState.window_parameters ?? rawState.windowParameters,
        embeddingOrigin: 'cases',
      } as LogRateAnalysisEmbeddableWrapperProps;

      const listItems = [
        {
          title: (
            <FormattedMessage
              id="xpack.aiops.logRateAnalysis.cases.timeRangeLabel"
              defaultMessage="Time range"
            />
          ),
          description: `${dataFormatter.convertToText(
            inputProps.timeRange.from
          )} - ${dataFormatter.convertToText(inputProps.timeRange.to)}`,
        },
      ];

      return (
        <>
          <EuiDescriptionList compressed type={'inline'} listItems={listItems} />
          <LogRateAnalysisComponent {...inputProps} />
        </>
      );
    });
  }
);
