/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import PropTypes from 'prop-types';
import React from 'react';

import { CHART_TYPE } from '../explorer_constants';

import { i18n } from '@kbn/i18n';
import { useExplorerChartTooltipStyles } from './explorer_chart_tooltip_styles';

const CHART_DESCRIPTION = {
  [CHART_TYPE.EVENT_DISTRIBUTION]: i18n.translate(
    'xpack.ml.explorer.charts.infoTooltip.chartEventDistributionDescription',
    {
      defaultMessage:
        'The gray dots depict the approximate distribution of occurrences over time for a sample of {byFieldValuesParam} with' +
        ' more frequent event types at the top and rarer ones at the bottom.',
      values: { byFieldValuesParam: 'by_field_values' },
    }
  ),
  [CHART_TYPE.POPULATION_DISTRIBUTION]: i18n.translate(
    'xpack.ml.explorer.charts.infoTooltip.chartPopulationDistributionDescription',
    {
      defaultMessage:
        'The gray dots depict the approximate distribution of values over time for a sample of {overFieldValuesParam}.',
      values: { overFieldValuesParam: 'over_field_values' },
    }
  ),
};

import { EuiSpacer } from '@elastic/eui';

function TooltipDefinitionList({ toolTipData }) {
  const {
    title: titleStyle,
    description: descriptionStyle,
    descriptionList,
  } = useExplorerChartTooltipStyles();

  return (
    <dl css={descriptionList}>
      {toolTipData.map(({ title, description }) => (
        <React.Fragment key={`${title} ${description}`}>
          <dt css={titleStyle}>{title}</dt>
          <dd css={descriptionStyle}>{description}</dd>
        </React.Fragment>
      ))}
    </dl>
  );
}

export const ExplorerChartInfoTooltip = ({
  jobId,
  aggregationInterval,
  chartFunction,
  chartType,
  entityFields = [],
}) => {
  const { tooltip, chartDescription: chartDescriptionStyle } = useExplorerChartTooltipStyles();

  const chartDescription = CHART_DESCRIPTION[chartType];

  const toolTipData = [
    {
      title: i18n.translate('xpack.ml.explorer.charts.infoTooltip.jobIdTitle', {
        defaultMessage: 'job ID',
      }),
      description: jobId,
    },
    {
      title: i18n.translate('xpack.ml.explorer.charts.infoTooltip.aggregationIntervalTitle', {
        defaultMessage: 'aggregation interval',
      }),
      description: aggregationInterval,
    },
    {
      title: i18n.translate('xpack.ml.explorer.charts.infoTooltip.chartFunctionTitle', {
        defaultMessage: 'chart function',
      }),
      description: chartFunction,
    },
  ];

  entityFields.forEach((entityField) => {
    toolTipData.push({
      title: entityField.fieldName,
      description: entityField.fieldValue,
    });
  });

  return (
    <div css={tooltip}>
      <TooltipDefinitionList toolTipData={toolTipData} />
      {chartDescription && (
        <React.Fragment>
          <EuiSpacer size="s" />
          <div css={chartDescriptionStyle}>{chartDescription}</div>
        </React.Fragment>
      )}
    </div>
  );
};
ExplorerChartInfoTooltip.propTypes = {
  jobId: PropTypes.string.isRequired,
  aggregationInterval: PropTypes.string,
  chartFunction: PropTypes.string,
  entityFields: PropTypes.array,
};
