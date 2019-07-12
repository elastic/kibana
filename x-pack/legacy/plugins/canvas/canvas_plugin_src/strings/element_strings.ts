/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

interface ElementStrings {
  displayName: string;
  help: string;
}

interface ElementStringDict {
  [elementName: string]: ElementStrings;
}

/**
 * This function will return a dictionary of strings, organized by Canvas
 * Element specification.  This function requires that `i18nProvider` be
 * properly initialized.
 */
export const getElementStrings = (): ElementStringDict => ({
  areaChart: {
    displayName: i18n.translate('xpack.canvas.elements.areaChartDisplayName', {
      defaultMessage: 'Area chart',
    }),
    help: i18n.translate('xpack.canvas.elements.areaChartHelpText', {
      defaultMessage: 'A line chart with a filled body',
    }),
  },
  bubbleChart: {
    displayName: i18n.translate('xpack.canvas.elements.bubbleChartDisplayName', {
      defaultMessage: 'Bubble chart',
    }),
    help: i18n.translate('xpack.canvas.elements.bubbleChartHelpText', {
      defaultMessage: 'A customizable bubble chart',
    }),
  },
  debug: {
    displayName: i18n.translate('xpack.canvas.elements.debugDisplayName', {
      defaultMessage: 'Debug',
    }),
    help: i18n.translate('xpack.canvas.elements.debugHelpText', {
      defaultMessage: 'Just dumps the configuration of the element',
    }),
  },
  donut: {
    displayName: i18n.translate('xpack.canvas.elements.donutChartDisplayName', {
      defaultMessage: 'Donut chart',
    }),
    help: i18n.translate('xpack.canvas.elements.donutChartHelpText', {
      defaultMessage: 'A customizable donut chart',
    }),
  },
  dropdown_filter: {
    displayName: i18n.translate('xpack.canvas.elements.dropdownFilterDisplayName', {
      defaultMessage: 'Dropdown Filter',
    }),
    help: i18n.translate('xpack.canvas.elements.dropdownFilterHelpText', {
      defaultMessage: 'A dropdown from which you can select values for an "exactly" filter',
    }),
  },
  horizontalBarChart: {
    displayName: i18n.translate('xpack.canvas.elements.horizontalBarChartDisplayName', {
      defaultMessage: 'Horizontal Bar chart',
    }),
    help: i18n.translate('xpack.canvas.elements.horizontalBarChartHelpText', {
      defaultMessage: 'A customizable horizontal bar chart',
    }),
  },
  horizontalProgressBar: {
    displayName: i18n.translate('xpack.canvas.elements.horizontalProgressBarDisplayName', {
      defaultMessage: 'Horizontal Progress Bar',
    }),
    help: i18n.translate('xpack.canvas.elements.horizontalProgressBarHelpText', {
      defaultMessage: 'Displays progress as a portion of a horizontal bar',
    }),
  },
  horizontalProgressPill: {
    displayName: i18n.translate('xpack.canvas.elements.horizontalProgressPillDisplayName', {
      defaultMessage: 'Horizontal Progress Pill',
    }),
    help: i18n.translate('xpack.canvas.elements.horizontalProgressPillHelpText', {
      defaultMessage: 'Displays progress as a portion of a horizontal pill',
    }),
  },
  image: {
    displayName: i18n.translate('xpack.canvas.elements.imageDisplayName', {
      defaultMessage: 'Image',
    }),
    help: i18n.translate('xpack.canvas.elements.imageHelpText', {
      defaultMessage: 'A static image',
    }),
  },
  lineChart: {
    displayName: i18n.translate('xpack.canvas.elements.lineChartDisplayName', {
      defaultMessage: 'Line chart',
    }),
    help: i18n.translate('xpack.canvas.elements.lineChartHelpText', {
      defaultMessage: 'A customizable line chart',
    }),
  },
  markdown: {
    displayName: i18n.translate('xpack.canvas.elements.markdownDisplayName', {
      defaultMessage: 'Markdown',
    }),
    help: i18n.translate('xpack.canvas.elements.markdownHelpText', {
      defaultMessage: 'Markup from Markdown',
    }),
  },
  metric: {
    displayName: i18n.translate('xpack.canvas.elements.metricDisplayName', {
      defaultMessage: 'Metric',
    }),
    help: i18n.translate('xpack.canvas.elements.metricHelpText', {
      defaultMessage: 'A number with a label',
    }),
  },
  pie: {
    displayName: i18n.translate('xpack.canvas.elements.pieDisplayName', {
      defaultMessage: 'Pie chart',
    }),
    help: i18n.translate('xpack.canvas.elements.pieHelpText', {
      defaultMessage: 'Pie chart',
    }),
  },
  plot: {
    displayName: i18n.translate('xpack.canvas.elements.plotDisplayName', {
      defaultMessage: 'Coordinate plot',
    }),
    help: i18n.translate('xpack.canvas.elements.plotHelpText', {
      defaultMessage: 'Mixed line, bar or dot charts',
    }),
  },
  progressGauge: {
    displayName: i18n.translate('xpack.canvas.elements.progressGaugeDisplayName', {
      defaultMessage: 'Progress Gauge',
    }),
    help: i18n.translate('xpack.canvas.elements.progressGaugeHelpText', {
      defaultMessage: 'Displays progress as a portion of a gauge',
    }),
  },
  progressSemicircle: {
    displayName: i18n.translate('xpack.canvas.elements.progressSemicircleDisplayName', {
      defaultMessage: 'Progress Semicircle',
    }),
    help: i18n.translate('xpack.canvas.elements.progressSemicircleHelpText', {
      defaultMessage: 'Displays progress as a portion of a semicircle',
    }),
  },
  progressWheel: {
    displayName: i18n.translate('xpack.canvas.elements.progressWheelDisplayName', {
      defaultMessage: 'Progress Wheel',
    }),
    help: i18n.translate('xpack.canvas.elements.progressWheelHelpText', {
      defaultMessage: 'Displays progress as a portion of a wheel',
    }),
  },
  repeatImage: {
    displayName: i18n.translate('xpack.canvas.elements.repeatImageDisplayName', {
      defaultMessage: 'Image repeat',
    }),
    help: i18n.translate('xpack.canvas.elements.repeatImageHelpText', {
      defaultMessage: 'Repeats an image N times',
    }),
  },
  revealImage: {
    displayName: i18n.translate('xpack.canvas.elements.revealImageDisplayName', {
      defaultMessage: 'Image reveal',
    }),
    help: i18n.translate('xpack.canvas.elements.revealImageHelpText', {
      defaultMessage: 'Reveals a percentage of an image',
    }),
  },
  shape: {
    displayName: i18n.translate('xpack.canvas.elements.shapeDisplayName', {
      defaultMessage: 'Shape',
    }),
    help: i18n.translate('xpack.canvas.elements.shapeHelpText', {
      defaultMessage: 'A customizable shape',
    }),
  },
  table: {
    displayName: i18n.translate('xpack.canvas.elements.tableDisplayName', {
      defaultMessage: 'Data table',
    }),
    help: i18n.translate('xpack.canvas.elements.tableHelpText', {
      defaultMessage: 'A scrollable grid for displaying data in a tabular format',
    }),
  },
  tiltedPie: {
    displayName: i18n.translate('xpack.canvas.elements.tiltedPieDisplayName', {
      defaultMessage: 'Tilted pie chart',
    }),
    help: i18n.translate('xpack.canvas.elements.tiltedPieHelpText', {
      defaultMessage: 'A customizable tilted pie chart',
    }),
  },
  time_filter: {
    displayName: i18n.translate('xpack.canvas.elements.timeFilterDisplayName', {
      defaultMessage: 'Time filter',
    }),
    help: i18n.translate('xpack.canvas.elements.timeFilterHelpText', {
      defaultMessage: 'Set a time window',
    }),
  },
  verticalBarChart: {
    displayName: i18n.translate('xpack.canvas.elements.verticalBarChartDisplayName', {
      defaultMessage: 'Vertical bar chart',
    }),
    help: i18n.translate('xpack.canvas.elements.verticalBarChartHelpText', {
      defaultMessage: 'A customizable vertical bar chart',
    }),
  },
  verticalProgressBar: {
    displayName: i18n.translate('xpack.canvas.elements.verticalProgressBarDisplayName', {
      defaultMessage: 'Vertical Progress Bar',
    }),
    help: i18n.translate('xpack.canvas.elements.verticalProgressBarHelpText', {
      defaultMessage: 'Displays progress as a portion of a vertical bar',
    }),
  },
  verticalProgressPill: {
    displayName: i18n.translate('xpack.canvas.elements.verticalProgressPillDisplayName', {
      defaultMessage: 'Vertical Progress Pill',
    }),
    help: i18n.translate('xpack.canvas.elements.verticalProgressPillHelpText', {
      defaultMessage: 'Displays progress as a portion of a vertical pill',
    }),
  },
});
