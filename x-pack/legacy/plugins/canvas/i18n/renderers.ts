/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { JSON, HTML, MARKDOWN } from './constants';

export const RendererStrings = {
  advancedFilter: {
    getDisplayName: () =>
      i18n.translate('xpack.canvas.renderer.advancedFilter.displayName', {
        defaultMessage: 'Advanced filter',
      }),
    getHelpDescription: () =>
      i18n.translate('xpack.canvas.renderer.advancedFilter.helpDescription', {
        defaultMessage: 'Render a Canvas filter expression',
      }),
  },
  debug: {
    getDisplayName: () =>
      i18n.translate('xpack.canvas.renderer.debug.displayName', {
        defaultMessage: 'Debug',
      }),
    getHelpDescription: () =>
      i18n.translate('xpack.canvas.renderer.debug.helpDescription', {
        defaultMessage: 'Render debug output as formatted {JSON}',
        values: {
          JSON,
        },
      }),
  },
  dropdownFilter: {
    getDisplayName: () =>
      i18n.translate('xpack.canvas.renderer.dropdownFilter.displayName', {
        defaultMessage: 'Dropdown filter',
      }),
    getHelpDescription: () =>
      i18n.translate('xpack.canvas.renderer.dropdownFilter.helpDescription', {
        defaultMessage: 'A dropdown from which you can select values for an "{exactly}" filter',
        values: {
          exactly: 'exactly',
        },
      }),
  },
  embeddable: {
    getDisplayName: () =>
      i18n.translate('xpack.canvas.renderer.embeddable.displayName', {
        defaultMessage: 'Embeddable',
      }),
    getHelpDescription: () =>
      i18n.translate('xpack.canvas.renderer.embeddable.helpDescription', {
        defaultMessage: 'Renders an embeddable Saved Object from other parts of Kibana',
      }),
  },
  error: {
    getDisplayName: () =>
      i18n.translate('xpack.canvas.renderer.error.displayName', {
        defaultMessage: 'Error information',
      }),
    getHelpDescription: () =>
      i18n.translate('xpack.canvas.renderer.error.helpDescription', {
        defaultMessage: 'Render error data in a way that is helpful to users',
      }),
  },
  image: {
    getDisplayName: () =>
      i18n.translate('xpack.canvas.renderer.image.displayName', {
        defaultMessage: 'Image',
      }),
    getHelpDescription: () =>
      i18n.translate('xpack.canvas.renderer.image.helpDescription', {
        defaultMessage: 'Render an image',
      }),
  },
  markdown: {
    getDisplayName: () =>
      i18n.translate('xpack.canvas.renderer.markdown.displayName', {
        defaultMessage: 'Markdown',
      }),
    getHelpDescription: () =>
      i18n.translate('xpack.canvas.renderer.markdown.helpDescription', {
        defaultMessage: 'Render {HTML} using {MARKDOWN} input',
        values: {
          HTML,
          MARKDOWN,
        },
      }),
  },
  metric: {
    getDisplayName: () =>
      i18n.translate('xpack.canvas.renderer.metric.displayName', {
        defaultMessage: 'Metric',
      }),
    getHelpDescription: () =>
      i18n.translate('xpack.canvas.renderer.metric.helpDescription', {
        defaultMessage: 'Render a number over a label',
      }),
  },
  pie: {
    getDisplayName: () =>
      i18n.translate('xpack.canvas.renderer.pie.displayName', {
        defaultMessage: 'Pie chart',
      }),
    getHelpDescription: () =>
      i18n.translate('xpack.canvas.renderer.pie.helpDescription', {
        defaultMessage: 'Render a pie chart from data',
      }),
  },
  plot: {
    getDisplayName: () =>
      i18n.translate('xpack.canvas.renderer.plot.displayName', {
        defaultMessage: 'Coordinate plot',
      }),
    getHelpDescription: () =>
      i18n.translate('xpack.canvas.renderer.plot.helpDescription', {
        defaultMessage: 'Render an XY plot from your data',
      }),
  },
  progress: {
    getDisplayName: () =>
      i18n.translate('xpack.canvas.renderer.progress.displayName', {
        defaultMessage: 'Progress indicator',
      }),
    getHelpDescription: () =>
      i18n.translate('xpack.canvas.renderer.progress.helpDescription', {
        defaultMessage: 'Render a progress indicator that reveals a percentage of an element',
      }),
  },
  repeatImage: {
    getDisplayName: () =>
      i18n.translate('xpack.canvas.renderer.repeatImage.displayName', {
        defaultMessage: 'Image repeat',
      }),
    getHelpDescription: () =>
      i18n.translate('xpack.canvas.renderer.repeatImage.helpDescription', {
        defaultMessage: 'Repeat an image a given number of times',
      }),
  },
  revealImage: {
    getDisplayName: () =>
      i18n.translate('xpack.canvas.renderer.revealImage.displayName', {
        defaultMessage: 'Image reveal',
      }),
    getHelpDescription: () =>
      i18n.translate('xpack.canvas.renderer.revealImage.helpDescription', {
        defaultMessage: 'Reveal a percentage of an image to make a custom gauge-style chart',
      }),
  },
  shape: {
    getDisplayName: () =>
      i18n.translate('xpack.canvas.renderer.shape.displayName', {
        defaultMessage: 'Shape',
      }),
    getHelpDescription: () =>
      i18n.translate('xpack.canvas.renderer.shape.helpDescription', {
        defaultMessage: 'Render a basic shape',
      }),
  },
  table: {
    getDisplayName: () =>
      i18n.translate('xpack.canvas.renderer.table.displayName', {
        defaultMessage: 'Data table',
      }),
    getHelpDescription: () =>
      i18n.translate('xpack.canvas.renderer.table.helpDescription', {
        defaultMessage: 'Render tabular data as {HTML}',
        values: {
          HTML,
        },
      }),
  },
  text: {
    getDisplayName: () =>
      i18n.translate('xpack.canvas.renderer.text.displayName', {
        defaultMessage: 'Plain text',
      }),
    getHelpDescription: () =>
      i18n.translate('xpack.canvas.renderer.text.helpDescription', {
        defaultMessage: 'Render output as plain text',
      }),
  },
  timeFilter: {
    getDisplayName: () =>
      i18n.translate('xpack.canvas.renderer.timeFilter.displayName', {
        defaultMessage: 'Time filter',
      }),
    getHelpDescription: () =>
      i18n.translate('xpack.canvas.renderer.timeFilter.helpDescription', {
        defaultMessage: 'Set a time window to filter your data',
      }),
  },
};
