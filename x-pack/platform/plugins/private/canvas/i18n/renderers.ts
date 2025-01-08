/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
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
