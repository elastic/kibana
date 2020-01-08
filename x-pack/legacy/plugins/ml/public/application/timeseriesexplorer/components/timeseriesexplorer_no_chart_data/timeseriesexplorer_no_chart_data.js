/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
 * React component for rendering EuiEmptyPrompt when no results were found.
 */

import React from 'react';

import { EuiEmptyPrompt } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

export const TimeseriesexplorerNoChartData = ({ dataNotChartable, entities }) => (
  <EuiEmptyPrompt
    iconType="iInCircle"
    title={
      <h2>
        {i18n.translate('xpack.ml.timeSeriesExplorer.noResultsFoundLabel', {
          defaultMessage: 'No results found',
        })}
      </h2>
    }
    body={
      dataNotChartable ? (
        <p>
          {i18n.translate('xpack.ml.timeSeriesExplorer.dataNotChartableDescription', {
            defaultMessage: `Model plot is not collected for the selected {entityCount, plural, one {entity} other {entities}}
and the source data cannot be plotted for this detector.`,
            values: {
              entityCount: entities.length,
            },
          })}
        </p>
      ) : (
        <p>
          {i18n.translate('xpack.ml.timeSeriesExplorer.tryWideningTheTimeSelectionDescription', {
            defaultMessage: 'Try widening the time selection or moving further back in time.',
          })}
        </p>
      )
    }
  />
);
