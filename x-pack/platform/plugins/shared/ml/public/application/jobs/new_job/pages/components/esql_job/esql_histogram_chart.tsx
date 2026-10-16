/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCallOut, EuiSpacer, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EventRateChart } from '../charts/event_rate_chart/event_rate_chart';
import { useEsqlWizardContext } from './esql_wizard_context';

/**
 * Row-count-per-bucket histogram for the Query & time range step (LEAD
 * DECISION 2026-09-29, g2sz.10): confirms the query actually returns rows
 * over the selected time range before the user configures detectors. Reads
 * the histogram result off wizard state — `useEsqlHistogramExecutor` (run
 * once at the wizard root) owns fetching it.
 */
export const EsqlHistogramChart = () => {
  const { state } = useEsqlWizardContext();
  const { histogramStatus, histogramTotalRows, histogramErrorMessage, histogramSeries } = state;

  if (histogramStatus === 'error') {
    return (
      <EuiCallOut
        title={i18n.translate('xpack.ml.esqlJob.histogram.errorTitle', {
          defaultMessage: 'Unable to run the row-count histogram',
        })}
        color="danger"
        iconType="error"
        announceOnMount
        data-test-subj="mlEsqlHistogramError"
      >
        <p>{histogramErrorMessage}</p>
      </EuiCallOut>
    );
  }

  // An empty result is explained once, by the output preview's empty state
  // right below; render nothing here so it is not announced twice (g2sz.28).
  if (histogramStatus === 'success' && histogramTotalRows === 0) {
    return null;
  }

  return (
    <div data-test-subj="mlEsqlHistogramChart">
      <EuiText size="s" color="subdued" data-test-subj="mlEsqlHistogramTotalRows">
        <p>
          <FormattedMessage
            id="xpack.ml.esqlJob.histogram.totalRowsDescription"
            defaultMessage="{totalRows, plural, one {# row} other {# rows}} across the selected time range."
            values={{ totalRows: histogramTotalRows }}
          />
        </p>
      </EuiText>
      <EuiSpacer size="s" />
      <EventRateChart
        eventRateChartData={histogramSeries}
        height="150px"
        width="100%"
        showAxis
        loading={histogramStatus === 'loading'}
      />
    </div>
  );
};
