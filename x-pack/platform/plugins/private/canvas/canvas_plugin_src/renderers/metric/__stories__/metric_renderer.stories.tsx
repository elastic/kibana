/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { CSSProperties } from 'react';
import { coreMock } from '@kbn/core/public/mocks';
import { Style } from '@kbn/expressions-plugin/common';
import { Render } from '@kbn/presentation-util-plugin/public/__stories__';
import { getMetricRenderer, MetricRendererConfig } from '../metric_renderer';

const labelFontSpec: CSSProperties = {
  fontFamily: "Baskerville, Georgia, Garamond, 'Times New Roman', Times, serif",
  fontWeight: 'normal',
  fontStyle: 'italic',
  textDecoration: 'none',
  textAlign: 'center',
  fontSize: '24px',
  lineHeight: '1',
  color: '#000000',
};

const metricFontSpec: CSSProperties = {
  fontFamily:
    "Optima, 'Lucida Grande', 'Lucida Sans Unicode', Verdana, Helvetica, Arial, sans-serif",
  fontWeight: 'bold',
  fontStyle: 'normal',
  textDecoration: 'none',
  textAlign: 'center',
  fontSize: '48px',
  lineHeight: '1',
  color: '#b83c6f',
};

export default {
  title: 'renderers/Metric',
};

const core = coreMock.createStart();

export const WithNullMetric = {
  render: () => {
    const config: MetricRendererConfig = {
      metric: null,
      metricFont: {} as Style,
      labelFont: {} as Style,
      label: '',
      metricFormat: '',
    };
    return <Render renderer={getMetricRenderer(core)} config={config} />;
  },

  name: 'with null metric',
};

export const WithNumberMetric = {
  render: () => {
    const config: MetricRendererConfig = {
      metric: '12345.6789',
      metricFont: metricFontSpec as Style,
      labelFont: {} as Style,
      label: '',
      metricFormat: '',
    };
    return <Render renderer={getMetricRenderer(core)} config={config} />;
  },

  name: 'with number metric',
};

export const WithStringMetric = {
  render: () => {
    const config: MetricRendererConfig = {
      metric: '$12.34',
      metricFont: metricFontSpec as Style,
      labelFont: labelFontSpec as Style,
      label: '',
      metricFormat: '',
    };
    return <Render renderer={getMetricRenderer(core)} config={config} />;
  },

  name: 'with string metric',
};

export const WithLabel = {
  render: () => {
    const config: MetricRendererConfig = {
      metric: '$12.34',
      metricFont: metricFontSpec as Style,
      labelFont: labelFontSpec as Style,
      label: 'Average price',
      metricFormat: '',
    };
    return <Render renderer={getMetricRenderer(core)} config={config} />;
  },

  name: 'with label',
};

export const WithNumberMetricAndASpecifiedFormat = {
  render: () => {
    const config: MetricRendererConfig = {
      metric: '-0.0024',
      metricFont: metricFontSpec as Style,
      labelFont: labelFontSpec as Style,
      label: 'Average price',
      metricFormat: '0.00%',
    };
    return <Render renderer={getMetricRenderer(core)} config={config} />;
  },

  name: 'with number metric and a specified format',
};

export const WithFormattedStringMetricAndASpecifiedFormat = {
  render: () => {
    const config: MetricRendererConfig = {
      metric: '$10000000.00',
      metricFont: metricFontSpec as Style,
      labelFont: labelFontSpec as Style,
      label: 'Total Revenue',
      metricFormat: '$0a',
    };
    return <Render renderer={getMetricRenderer(core)} config={config} />;
  },

  name: 'with formatted string metric and a specified format',
};

export const WithInvalidMetricFont = {
  render: () => {
    const config: MetricRendererConfig = {
      metric: '$10000000.00',
      metricFont: metricFontSpec as Style,
      labelFont: labelFontSpec as Style,
      label: 'Total Revenue',
      metricFormat: '$0a',
    };
    return <Render renderer={getMetricRenderer(core)} config={config} />;
  },

  name: 'with invalid metricFont',
};
