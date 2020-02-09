/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { CSSProperties } from 'react';
import ReactDOM from 'react-dom';
import { RendererFactory, Style } from '../../../types';
import { RendererStrings } from '../../../i18n';
import { Metric } from './component/metric';

const { metric: strings } = RendererStrings;

export interface Config {
  /** The text to display under the metric */
  label: string;
  /** Font settings for the label */
  labelFont: Style;
  /** Value of the metric to display */
  metric: string | number | null;
  /** Font settings for the metric */
  metricFont: Style;
  /** NumeralJS format string */
  metricFormat: string;
}

export const metric: RendererFactory<Config> = () => ({
  name: 'metric',
  displayName: strings.getDisplayName(),
  help: strings.getHelpDescription(),
  reuseDomNode: true,
  render(domNode, config, handlers) {
    ReactDOM.render(
      <Metric
        label={config.label}
        labelFont={config.labelFont ? (config.labelFont.spec as CSSProperties) : {}}
        metric={config.metric}
        metricFont={config.metricFont ? (config.metricFont.spec as CSSProperties) : {}}
        metricFormat={config.metricFormat}
      />,
      domNode,
      () => handlers.done()
    );

    handlers.onDestroy(() => ReactDOM.unmountComponentAtNode(domNode));
  },
});
