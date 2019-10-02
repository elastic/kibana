/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

import {
  BOOLEAN_FALSE,
  BOOLEAN_TRUE,
  CANVAS,
  CSS,
  ELASTICSEARCH,
  HEX,
  HTML,
  KIBANA,
  LUCENE,
  MARKDOWN,
  MOMENTJS,
  NUMERALJS,
  RGB,
  SQL,
  TIMELION,
  URL,
} from '../../i18n';

export const ArgumentStrings = {
  AxisConfig: {
    getDisplayName: () =>
      i18n.translate('xpack.canvas.uis.arguments.axisConfigTitle', {
        defaultMessage: 'Axis config',
      }),
    getHelp: () =>
      i18n.translate('xpack.canvas.uis.arguments.axisConfigLabel', {
        defaultMessage: 'Visualization axis configuration',
      }),
    getPositionLabel: () =>
      i18n.translate('xpack.canvas.uis.arguments.axisConfig.positionLabel', {
        defaultMessage: 'Position',
      }),
    getPositionTop: () =>
      i18n.translate('xpack.canvas.uis.arguments.axisConfig.position.options.topDropDown', {
        defaultMessage: 'top',
      }),
    getPositionBottom: () =>
      i18n.translate('xpack.canvas.uis.arguments.axisConfig.position.options.bottomDropDown', {
        defaultMessage: 'bottom',
      }),
    getPositionRight: () =>
      i18n.translate('xpack.canvas.uis.arguments.axisConfig.position.options.rightDropDown', {
        defaultMessage: 'right',
      }),
    getPositionLeft: () =>
      i18n.translate('xpack.canvas.uis.arguments.axisConfig.position.options.leftDropDown', {
        defaultMessage: 'left',
      }),
  },
  DataColumn: {
    getDisplayName: () =>
      i18n.translate('xpack.canvas.uis.arguments.dataColumnTitle', {
        defaultMessage: 'Column',
      }),
    getHelp: () =>
      i18n.translate('xpack.canvas.uis.arguments.dataColumnLabel', {
        defaultMessage: 'Select the data column',
      }),
    getOptionAverage: () =>
      i18n.translate('xpack.canvas.uis.arguments.dataColumn.options.averageDropDown', {
        defaultMessage: 'Average',
      }),
    getOptionCount: () =>
      i18n.translate('xpack.canvas.uis.arguments.dataColumn.options.countDropDown', {
        defaultMessage: 'Count',
      }),
    getOptionFirst: () =>
      i18n.translate('xpack.canvas.uis.arguments.dataColumn.options.firstDropDown', {
        defaultMessage: 'First',
      }),
    getOptionLast: () =>
      i18n.translate('xpack.canvas.uis.arguments.dataColumn.options.lastDropDown', {
        defaultMessage: 'Last',
      }),
    getOptionMax: () =>
      i18n.translate('xpack.canvas.uis.arguments.dataColumn.options.maxDropDown', {
        defaultMessage: 'Max',
      }),
    getOptionMedian: () =>
      i18n.translate('xpack.canvas.uis.arguments.dataColumn.options.medianDropDown', {
        defaultMessage: 'Median',
      }),
    getOptionMin: () =>
      i18n.translate('xpack.canvas.uis.arguments.dataColumn.options.minDropDown', {
        defaultMessage: 'Min',
      }),
    getOptionSum: () =>
      i18n.translate('xpack.canvas.uis.arguments.dataColumn.options.sumDropDown', {
        defaultMessage: 'Sum',
      }),
    getOptionUnique: () =>
      i18n.translate('xpack.canvas.uis.arguments.dataColumn.options.uniqueDropDown', {
        defaultMessage: 'Unique',
      }),
    getOptionValue: () =>
      i18n.translate('xpack.canvas.uis.arguments.dataColumn.options.valueDropDown', {
        defaultMessage: 'Value',
      }),
  },
  DateFormat: {
    getDisplayName: () =>
      i18n.translate('xpack.canvas.uis.arguments.dateFormatTitle', {
        defaultMessage: 'Date Format',
      }),
    getHelp: () =>
      i18n.translate('xpack.canvas.uis.arguments.dateFormatLabel', {
        defaultMessage: 'Select or enter a {momentJS} format',
        values: {
          momentJS: MOMENTJS,
        },
      }),
  },
  FilterGroup: {
    getDisplayName: () =>
      i18n.translate('xpack.canvas.uis.arguments.filterGroupTitle', {
        defaultMessage: 'Filter Group',
      }),
    getHelp: () =>
      i18n.translate('xpack.canvas.uis.arguments.filterGroupLabel', {
        defaultMessage: 'Create or select a filter group',
      }),
    getCreateNewGroup: () =>
      i18n.translate('xpack.canvas.uis.arguments.filterGroup.createNewGroupLinkText', {
        defaultMessage: 'Create new group',
      }),
  },
  ImageUpload: {
    getDisplayName: () =>
      i18n.translate('xpack.canvas.uis.arguments.imageUploadTitle', {
        defaultMessage: 'Image upload',
      }),
    getHelp: () =>
      i18n.translate('xpack.canvas.uis.arguments.imageUploadLabel', {
        defaultMessage: 'Select or upload an image',
      }),
    getImageUploading: () =>
      i18n.translate('xpack.canvas.uis.arguments.imageUpload.imageUploadingLabel', {
        defaultMessage: 'Image uploading',
      }),
    getFileUploadPrompt: () =>
      i18n.translate('xpack.canvas.uis.arguments.imageUpload.fileUploadPromptLabel', {
        defaultMessage: 'Select or drag and drop an image',
      }),
    getUrlFieldPlaceholder: () =>
      i18n.translate('xpack.canvas.uis.arguments.imageUpload.urlFieldPlaceholder', {
        defaultMessage: 'Image {url}',
        values: {
          url: URL,
        },
      }),
    getFileUrlType: () =>
      i18n.translate('xpack.canvas.uis.arguments.imageUpload.urlTypes.fileDropDown', {
        defaultMessage: 'Import',
      }),
    getLinkUrlType: () =>
      i18n.translate('xpack.canvas.uis.arguments.imageUpload.urlTypes.linkDropDown', {
        defaultMessage: 'Link',
      }),
    getAssetUrlType: () =>
      i18n.translate('xpack.canvas.uis.arguments.imageUpload.urlTypes.assetDropDown', {
        defaultMessage: 'Asset',
      }),
  },
  Number: {
    getDisplayName: () =>
      i18n.translate('xpack.canvas.uis.arguments.numberTitle', {
        defaultMessage: 'Number',
      }),
    getHelp: () =>
      i18n.translate('xpack.canvas.uis.arguments.numberLabel', {
        defaultMessage: 'Input a number',
      }),
  },
  NumberFormat: {
    getDisplayName: () =>
      i18n.translate('xpack.canvas.uis.arguments.numberFormatTitle', {
        defaultMessage: 'Number Format',
      }),
    getHelp: () =>
      i18n.translate('xpack.canvas.uis.arguments.numberFormatLabel', {
        defaultMessage: 'Select or enter a valid {numeralJS} format',
        values: {
          numeralJS: NUMERALJS,
        },
      }),
    getFormatNumber: () =>
      i18n.translate('xpack.canvas.uis.arguments.numberFormat.format.numberDropDown', {
        defaultMessage: 'Number',
      }),
    getFormatPercent: () =>
      i18n.translate('xpack.canvas.uis.arguments.numberFormat.format.percentDropDown', {
        defaultMessage: 'Percent',
      }),
    getFormatCurrency: () =>
      i18n.translate('xpack.canvas.uis.arguments.numberFormat.format.currencyDropDown', {
        defaultMessage: 'Currency',
      }),
    getFormatDuration: () =>
      i18n.translate('xpack.canvas.uis.arguments.numberFormat.format.durationDropDown', {
        defaultMessage: 'Duration',
      }),
    getFormatBytes: () =>
      i18n.translate('xpack.canvas.uis.arguments.numberFormat.format.bytesDropDown', {
        defaultMessage: 'Bytes',
      }),
  },
  Palette: {
    getDisplayName: () =>
      i18n.translate('xpack.canvas.uis.arguments.paletteTitle', {
        defaultMessage: 'Color palette',
      }),
    getHelp: () =>
      i18n.translate('xpack.canvas.uis.arguments.paletteLabel', {
        defaultMessage: 'Choose a color palette',
      }),
  },
  Percentage: {
    getDisplayName: () =>
      i18n.translate('xpack.canvas.uis.arguments.percentageTitle', {
        defaultMessage: 'Percentage',
      }),
    getHelp: () =>
      i18n.translate('xpack.canvas.uis.arguments.percentageLabel', {
        defaultMessage: 'Slider for percentage ',
      }),
  },
  Range: {
    getDisplayName: () =>
      i18n.translate('xpack.canvas.uis.arguments.rangeTitle', {
        defaultMessage: 'Range',
      }),
    getHelp: () =>
      i18n.translate('xpack.canvas.uis.arguments.rangeLabel', {
        defaultMessage: 'Slider for values within a range',
      }),
  },
  Select: {
    getDisplayName: () =>
      i18n.translate('xpack.canvas.uis.arguments.selectTitle', {
        defaultMessage: 'Select',
      }),
    getHelp: () =>
      i18n.translate('xpack.canvas.uis.arguments.selectLabel', {
        defaultMessage: 'Select from multiple options in a drop down',
      }),
  },
  Shape: {
    getDisplayName: () =>
      i18n.translate('xpack.canvas.uis.arguments.shapeTitle', {
        defaultMessage: 'Shape',
      }),
    getHelp: () =>
      i18n.translate('xpack.canvas.uis.arguments.shapeLabel', {
        defaultMessage: 'Shape picker',
      }),
  },
  String: {
    getDisplayName: () =>
      i18n.translate('xpack.canvas.uis.arguments.stringTitle', {
        defaultMessage: 'String',
      }),
    getHelp: () =>
      i18n.translate('xpack.canvas.uis.arguments.stringLabel', {
        defaultMessage: 'Input short strings',
      }),
  },
  Textarea: {
    getDisplayName: () =>
      i18n.translate('xpack.canvas.uis.arguments.textareaTitle', {
        defaultMessage: 'Textarea',
      }),
    getHelp: () =>
      i18n.translate('xpack.canvas.uis.arguments.textareaLabel', {
        defaultMessage: 'Input long strings',
      }),
  },
  Toggle: {
    getDisplayName: () =>
      i18n.translate('xpack.canvas.uis.arguments.toggleTitle', {
        defaultMessage: 'Toggle',
      }),
    getHelp: () =>
      i18n.translate('xpack.canvas.uis.arguments.toggleLabel', {
        defaultMessage: 'A true/false toggle switch',
      }),
  },
};

export const DataSourceStrings = {
  DemoData: {
    getDisplayName: () =>
      i18n.translate('xpack.canvas.uis.dataSources.demoDataTitle', {
        defaultMessage: 'Demo data',
      }),
    getHelp: () =>
      i18n.translate('xpack.canvas.uis.dataSources.demoDataLabel', {
        defaultMessage: 'Mock data set with usernames, prices, projects, countries, and phases',
      }),
    getHeading: () =>
      i18n.translate('xpack.canvas.uis.dataSources.demoData.headingTitle', {
        defaultMessage: 'You are using demo data',
      }),
  },
  Essql: {
    getDisplayName: () =>
      i18n.translate('xpack.canvas.uis.dataSources.essqlTitle', {
        defaultMessage: '{elasticsearch} {sql}',
        values: {
          elasticsearch: ELASTICSEARCH,
          sql: SQL,
        },
      }),
    getHelp: () =>
      i18n.translate('xpack.canvas.uis.dataSources.essqlLabel', {
        defaultMessage: 'Use {elasticsearch} {sql} to get a data table',
        values: {
          elasticsearch: ELASTICSEARCH,
          sql: SQL,
        },
      }),
    getLabel: () =>
      i18n.translate('xpack.canvas.uis.dataSources.essql.queryTitle', {
        defaultMessage: '{elasticsearch} {sql} query',
        values: {
          elasticsearch: ELASTICSEARCH,
          sql: SQL,
        },
      }),
  },
  Timelion: {
    getHelp: () =>
      i18n.translate('xpack.canvas.uis.dataSources.timelionLabel', {
        defaultMessage: 'Use {timelion} syntax to retrieve a timeseries',
        values: {
          timelion: TIMELION,
        },
      }),
    getAbout: () =>
      i18n.translate('xpack.canvas.uis.dataSources.timelion.aboutDetail', {
        defaultMessage:
          '{canvas} integrates with {kibanaTimelion} application to allow you to use {timelion} queries to pull back timeseries data in a tabular format that can be used with {canvas} elements.',
        values: {
          timelion: TIMELION,
          kibanaTimelion: `${KIBANA}'s ${TIMELION}`,
          canvas: CANVAS,
        },
      }),
    getQueryLabel: () =>
      i18n.translate('xpack.canvas.uis.dataSources.timelion.queryTitle', {
        defaultMessage: 'Query',
      }),
    getQueryHelp: () =>
      i18n.translate('xpack.canvas.uis.dataSources.timelion.queryLabel', {
        defaultMessage: '{lucene} Query String syntax',
        values: {
          lucene: LUCENE,
        },
      }),
    getIntervalLabel: () =>
      i18n.translate('xpack.canvas.uis.dataSources.timelion.intervalTitle', {
        defaultMessage: 'Interval',
      }),
    getIntervalHelp: () =>
      i18n.translate('xpack.canvas.uis.dataSources.timelion.intervalLabel', {
        defaultMessage:
          'Accepts {elasticsearch} date math: {weeksExample}, {daysExample}, {secondsExample}, or {auto}',
        values: {
          elasticsearch: ELASTICSEARCH,
          secondsExample: '10s',
          daysExample: '5d',
          weeksExample: '1w',
          auto: 'auto',
        },
      }),
    getTipsHeading: () =>
      i18n.translate('xpack.canvas.uis.dataSources.timelion.tipsTitle', {
        defaultMessage: 'Some tips',
      }),
  },
};

export const ModelStrings = {
  PointSeries: {
    getDisplayName: () =>
      i18n.translate('xpack.canvas.uis.models.pointSeriesTitle', {
        defaultMessage: 'Dimensions & measures',
      }),
    getXAxisDisplayName: () =>
      i18n.translate('xpack.canvas.uis.models.pointSeries.args.xaxisTitle', {
        defaultMessage: 'X-axis',
      }),
    getXAxisHelp: () =>
      i18n.translate('xpack.canvas.uis.models.pointSeries.args.xaxisLabel', {
        defaultMessage: 'Data along the horizontal axis. Usually a number, string or date',
      }),
    getYaxisDisplayName: () =>
      i18n.translate('xpack.canvas.uis.models.pointSeries.args.yaxisTitle', {
        defaultMessage: 'Y-axis',
      }),
    getYaxisHelp: () =>
      i18n.translate('xpack.canvas.uis.models.pointSeries.args.yaxisLabel', {
        defaultMessage: 'Data along the vertical axis. Usually a number',
      }),
    getColorDisplayName: () =>
      i18n.translate('xpack.canvas.uis.models.pointSeries.args.colorTitle', {
        defaultMessage: 'Color',
      }),
    getColorHelp: () =>
      i18n.translate('xpack.canvas.uis.models.pointSeries.args.colorLabel', {
        defaultMessage: 'Determines the color of a mark or series',
      }),
    getSizeDisplayName: () =>
      i18n.translate('xpack.canvas.uis.models.pointSeries.args.sizeTitle', {
        defaultMessage: 'Size',
      }),
    getSizeHelp: () =>
      i18n.translate('xpack.canvas.uis.models.pointSeries.args.sizeLabel', {
        defaultMessage: 'Determine the size of a mark',
      }),
    getTextDisplayName: () =>
      i18n.translate('xpack.canvas.uis.models.pointSeries.args.textTitle', {
        defaultMessage: 'Text',
      }),
    getTextHelp: () =>
      i18n.translate('xpack.canvas.uis.models.pointSeries.args.textLabel', {
        defaultMessage: 'Set the text to use as, or around, the mark',
      }),
  },
};

export const TransformStrings = {
  FormatDate: {
    getDisplayName: () =>
      i18n.translate('xpack.canvas.uis.transforms.formatDateTitle', {
        defaultMessage: 'Date format',
      }),
    getFormatDisplayName: () =>
      i18n.translate('xpack.canvas.uis.transforms.formatDate.args.formatTitle', {
        defaultMessage: 'Format',
      }),
  },
  FormatNumber: {
    getDisplayName: () =>
      i18n.translate('xpack.canvas.uis.transforms.formatNumberTitle', {
        defaultMessage: 'Number format',
      }),
    getFormatDisplayName: () =>
      i18n.translate('xpack.canvas.uis.transforms.formatNumber.args.formatTitle', {
        defaultMessage: 'Format',
      }),
  },
  RoundDate: {
    getDisplayName: () =>
      i18n.translate('xpack.canvas.uis.transforms.roundDateTitle', {
        defaultMessage: 'Round date',
      }),
    getFormatDisplayName: () =>
      i18n.translate('xpack.canvas.uis.transforms.roundDate.args.formatTitle', {
        defaultMessage: 'Format',
      }),
    getFormatHelp: () =>
      i18n.translate('xpack.canvas.uis.transforms.roundDate.args.formatLabel', {
        defaultMessage: 'Select or enter a {momentJs} format to round the date',
        values: {
          momentJs: MOMENTJS,
        },
      }),
  },
  Sort: {
    getDisplayName: () =>
      i18n.translate('xpack.canvas.uis.transforms.sortTitle', {
        defaultMessage: 'Datatable sorting',
      }),
    getSortFieldDisplayName: () =>
      i18n.translate('xpack.canvas.uis.transforms.sort.args.sortFieldTitle', {
        defaultMessage: 'Sort field',
      }),
    getReverseDisplayName: () =>
      i18n.translate('xpack.canvas.uis.transforms.sort.args.reverseToggleSwitch', {
        defaultMessage: 'Descending',
      }),
  },
};

export const ViewStrings = {
  DropdownControl: {
    getDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.dropdownControlTitle', {
        defaultMessage: 'Dropdown filter',
      }),
    getValueDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.dropdownControl.args.valueColumnTitle', {
        defaultMessage: 'Values column',
      }),
    getValueHelp: () =>
      i18n.translate('xpack.canvas.uis.views.dropdownControl.args.valueColumnLabel', {
        defaultMessage: 'Column from which to extract values to make available in the dropdown',
      }),
    getFilterDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.dropdownControl.args.filterColumnTitle', {
        defaultMessage: 'Filter column',
      }),
    getFilterHelp: () =>
      i18n.translate('xpack.canvas.uis.views.dropdownControl.args.filterColumnLabel', {
        defaultMessage: 'Column to which the value selected from the dropdown is applied',
      }),
    getFilterGroupDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.dropdownControl.args.filterGroupTitle', {
        defaultMessage: 'Filter group',
      }),
    getFilterGroupHelp: () =>
      i18n.translate('xpack.canvas.uis.views.dropdownControl.args.filterGroupLabel', {
        defaultMessage:
          "Apply the selected group name to an element's filters function to target this filter",
      }),
  },
  GetCell: {
    getDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.getCellTitle', {
        defaultMessage: 'Dropdown filter',
      }),
    getHelp: () =>
      i18n.translate('xpack.canvas.uis.views.getCellLabel', {
        defaultMessage: 'Grab the first row and first column',
      }),
  },
  Image: {
    getDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.imageTitle', {
        defaultMessage: 'Image',
      }),
    getModeDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.image.args.modeTitle', {
        defaultMessage: 'Fill mode',
      }),
    getModeHelp: () =>
      i18n.translate('xpack.canvas.uis.views.image.args.modeLabel', {
        defaultMessage: 'Note: Stretched fill may not work with vector images',
      }),
    getContainMode: () =>
      i18n.translate('xpack.canvas.uis.views.image.args.mode.containDropDown', {
        defaultMessage: 'Contain',
      }),
    getCoverMode: () =>
      i18n.translate('xpack.canvas.uis.views.image.args.mode.coverDropDown', {
        defaultMessage: 'Cover',
      }),
    getStretchMode: () =>
      i18n.translate('xpack.canvas.uis.views.image.args.mode.stretchDropDown', {
        defaultMessage: 'Stretch',
      }),
  },
  Markdown: {
    getDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.markdownTitle', {
        defaultMessage: '{markdown}',
        values: {
          markdown: MARKDOWN,
        },
      }),
    getHelp: () =>
      i18n.translate('xpack.canvas.uis.views.markdownLabel', {
        defaultMessage: 'Generate markup using {markdown}',
        values: {
          markdown: MARKDOWN,
        },
      }),
    getContentDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.markdown.args.contentTitle', {
        defaultMessage: '{markdown} content',
        values: {
          markdown: MARKDOWN,
        },
      }),
    getContentHelp: () =>
      i18n.translate('xpack.canvas.uis.views.markdown.args.contentLabel', {
        defaultMessage: '{markdown} formatted text',
        values: {
          markdown: MARKDOWN,
        },
      }),
  },
  Metric: {
    getDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.metricTitle', {
        defaultMessage: 'Metric',
      }),
    getLabelDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.metric.args.labelArgTitle', {
        defaultMessage: 'Label',
      }),
    getLabelHelp: () =>
      i18n.translate('xpack.canvas.uis.views.metric.args.labelArgLabel', {
        defaultMessage: 'Describes the metric',
      }),
    getLabelFontDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.metric.args.labelFontTitle', {
        defaultMessage: 'Label text settings',
      }),
    getLabelFontHelp: () =>
      i18n.translate('xpack.canvas.uis.views.metric.args.labelFontLabel', {
        defaultMessage: 'Fonts, alignment and color',
      }),
    getMetricFontDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.metric.args.metricFontTitle', {
        defaultMessage: 'Metric text settings',
      }),
    getMetricFontHelp: () =>
      i18n.translate('xpack.canvas.uis.views.metric.args.metricFontLabel', {
        defaultMessage: 'Fonts, alignment and color',
      }),
    getMetricFormatDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.metric.args.metricFormatTitle', {
        defaultMessage: 'Metric Format',
      }),
    getMetricFormatHelp: () =>
      i18n.translate('xpack.canvas.uis.views.metric.args.metricFormatLabel', {
        defaultMessage: 'Fonts, alignment and color',
      }),
  },
  Pie: {
    getDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.pieTitle', {
        defaultMessage: 'Chart style',
      }),
    getHoleDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.pie.args.holeTitle', {
        defaultMessage: 'Inner radius',
      }),
    getHoleHelp: () =>
      i18n.translate('xpack.canvas.uis.views.pie.args.holeLabel', {
        defaultMessage: 'Radius of the hole',
      }),
    getLabelsDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.pie.args.labelsTitle', {
        defaultMessage: 'Labels',
      }),
    getLabelsHelp: () =>
      i18n.translate('xpack.canvas.uis.views.pie.args.labelsToggleSwitch', {
        defaultMessage: 'Show/hide labels',
      }),
    getLabelRadiusDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.pie.args.labelRadiusTitle', {
        defaultMessage: 'Label radius',
      }),
    getLabelRadiusHelp: () =>
      i18n.translate('xpack.canvas.uis.views.pie.args.labelRadiusLabel', {
        defaultMessage: 'Distance of the labels from the center of the pie',
      }),
    getLegendDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.pie.args.legendTitle', {
        defaultMessage: 'Legend position',
      }),
    getLegendHelp: () =>
      i18n.translate('xpack.canvas.uis.views.pie.args.legendLabel', {
        defaultMessage: 'Disable or position the legend',
      }),
    getRadiusDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.pie.args.radiusTitle', {
        defaultMessage: 'Radius',
      }),
    getRadiusHelp: () =>
      i18n.translate('xpack.canvas.uis.views.pie.args.radiusLabel', {
        defaultMessage: 'Radius of the pie',
      }),
    getTiltDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.pie.args.tiltTitle', {
        defaultMessage: 'Tilt angle',
      }),
    getTiltHelp: () =>
      i18n.translate('xpack.canvas.uis.views.pie.args.tiltLabel', {
        defaultMessage: 'Percentage of tilt where 100 is fully vertical and 0 is completely flat',
      }),
  },
  Plot: {
    getDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.plotTitle', {
        defaultMessage: 'Chart style',
      }),
    getLegendDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.plot.args.legendTitle', {
        defaultMessage: 'Legend position',
      }),
    getLegendHelp: () =>
      i18n.translate('xpack.canvas.uis.views.plot.args.legendLabel', {
        defaultMessage: 'Disable or position the legend',
      }),
    getXaxisDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.plot.args.xaxisTitle', {
        defaultMessage: 'X-axis',
      }),
    getXaxisHelp: () =>
      i18n.translate('xpack.canvas.uis.views.plot.args.xaxisLabel', {
        defaultMessage: 'Configure or disable the x-axis',
      }),
    getYaxisDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.plot.args.yaxisTitle', {
        defaultMessage: 'Y-axis',
      }),
    getYaxisHelp: () =>
      i18n.translate('xpack.canvas.uis.views.plot.args.yaxisLabel', {
        defaultMessage: 'Configure or disable the Y-axis',
      }),
    getDefaultStyleDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.plot.args.defaultStyleTitle', {
        defaultMessage: 'Default style',
      }),
    getDefaultStyleHelp: () =>
      i18n.translate('xpack.canvas.uis.views.plot.args.defaultStyleLabel', {
        defaultMessage: 'Set the style to be used by default by every series, unless overridden',
      }),
  },
  Progress: {
    getDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.progressTitle', {
        defaultMessage: 'Progress',
      }),
    getShapeDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.progress.args.shapeTitle', {
        defaultMessage: 'Shape',
      }),
    getShapeHelp: () =>
      i18n.translate('xpack.canvas.uis.views.progress.args.shapeLabel', {
        defaultMessage: 'Shape of the progress indicator',
      }),
    getMaxDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.progress.args.maxTitle', {
        defaultMessage: 'Maximum value',
      }),
    getMaxHelp: () =>
      i18n.translate('xpack.canvas.uis.views.progress.args.maxLabel', {
        defaultMessage: 'Maximum value of the progress element',
      }),
    getValueColorDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.progress.args.valueColorTitle', {
        defaultMessage: 'Progress color',
      }),
    getValueColorHelp: () =>
      i18n.translate('xpack.canvas.uis.views.progress.args.valueColorLabel', {
        defaultMessage: 'Accepts {hex}, {rgb} or {html} Color names',
        values: {
          html: HTML,
          hex: HEX,
          rgb: RGB,
        },
      }),
    getValueWeightDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.progress.args.valueWeightTitle', {
        defaultMessage: 'Progress weight',
      }),
    getValueWeightHelp: () =>
      i18n.translate('xpack.canvas.uis.views.progress.args.valueWeightLabel', {
        defaultMessage: 'Thickness of the progress bar',
      }),
    getBarColorDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.progress.args.barColorTitle', {
        defaultMessage: 'Background color',
      }),
    getBarColorHelp: () =>
      i18n.translate('xpack.canvas.uis.views.progress.args.barColorLabel', {
        defaultMessage: 'Accepts HEX, RGB or HTML Color names',
      }),
    getBarWeightDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.progress.args.barWeightTitle', {
        defaultMessage: 'Background weight',
      }),
    getBarWeightHelp: () =>
      i18n.translate('xpack.canvas.uis.views.progress.args.barWeightLabel', {
        defaultMessage: 'Thickness of the background bar',
      }),
    getLabelDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.progress.args.labelArgTitle', {
        defaultMessage: 'Label',
      }),
    getLabelHelp: () =>
      i18n.translate('xpack.canvas.uis.views.progress.args.labelArgLabel', {
        defaultMessage: `Set {true}/{false} to show/hide label or provide a string to display as the label`,
        values: {
          true: BOOLEAN_TRUE,
          false: BOOLEAN_FALSE,
        },
      }),
    getFontDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.progress.args.fontTitle', {
        defaultMessage: 'Label settings',
      }),
    getFontHelp: () =>
      i18n.translate('xpack.canvas.uis.views.progress.args.fontLabel', {
        defaultMessage:
          'Font settings for the label. Technically, you can add other styles as well',
      }),
  },
  Render: {
    getDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.renderTitle', {
        defaultMessage: 'Element style',
      }),
    getHelp: () =>
      i18n.translate('xpack.canvas.uis.views.renderLabel', {
        defaultMessage: 'Setting for the container around your element',
      }),
    getCssHelp: () =>
      i18n.translate('xpack.canvas.uis.views.render.args.cssLabel', {
        defaultMessage: 'A {css} stylesheet scoped to your element',
        values: {
          css: CSS,
        },
      }),
    getCssApply: () =>
      i18n.translate('xpack.canvas.uis.views.render.args.css.applyButtonLabel', {
        defaultMessage: 'Apply Stylesheet',
      }),
  },
  RepeatImage: {
    getDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.repeatImageTitle', {
        defaultMessage: 'Repeating image',
      }),
    getImageDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.repeatImage.args.imageTitle', {
        defaultMessage: 'Image',
      }),
    getImageHelp: () =>
      i18n.translate('xpack.canvas.uis.views.repeatImage.args.imageLabel', {
        defaultMessage: 'An image to repeat',
      }),
    getEmptyImageDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.repeatImage.args.emptyImageTitle', {
        defaultMessage: 'Empty image',
      }),
    getEmptyImageHelp: () =>
      i18n.translate('xpack.canvas.uis.views.repeatImage.args.emptyImageLabel', {
        defaultMessage: 'An image to fill up the difference between the value and the max count',
      }),
    getSizeDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.repeatImage.args.sizeTitle', {
        defaultMessage: 'Image size',
      }),
    getSizeHelp: () =>
      i18n.translate('xpack.canvas.uis.views.repeatImage.args.sizeLabel', {
        defaultMessage:
          'The size of the largest dimension of the image. Eg, if the image is tall but not wide, this is the height',
      }),
    getMaxDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.repeatImage.args.maxTitle', {
        defaultMessage: 'Max count',
      }),
    getMaxHelp: () =>
      i18n.translate('xpack.canvas.uis.views.repeatImage.args.maxLabel', {
        defaultMessage: 'The maximum number of repeated images',
      }),
  },
  RevealImage: {
    getDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.revealImageTitle', {
        defaultMessage: 'Reveal image',
      }),
    getImageDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.revealImage.args.imageTitle', {
        defaultMessage: 'Image',
      }),
    getImageHelp: () =>
      i18n.translate('xpack.canvas.uis.views.revealImage.args.imageLabel', {
        defaultMessage: 'An image to reveal given the function input. Eg, a full glass',
      }),
    getEmptyImageDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.revealImage.args.emptyImageTitle', {
        defaultMessage: 'Background image',
      }),
    getEmptyImageHelp: () =>
      i18n.translate('xpack.canvas.uis.views.revealImage.args.emptyImageLabel', {
        defaultMessage: 'A background image. Eg, an empty glass',
      }),
    getOriginDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.revealImage.args.originTitle', {
        defaultMessage: 'Reveal from',
      }),
    getOriginHelp: () =>
      i18n.translate('xpack.canvas.uis.views.revealImage.args.originLabel', {
        defaultMessage: 'The direction from which to start the reveal',
      }),
    getOriginTop: () =>
      i18n.translate('xpack.canvas.uis.views.revealImage.args.origin.topDropDown', {
        defaultMessage: 'Top',
      }),
    getOriginLeft: () =>
      i18n.translate('xpack.canvas.uis.views.revealImage.args.origin.leftDropDown', {
        defaultMessage: 'Left',
      }),
    getOriginBottom: () =>
      i18n.translate('xpack.canvas.uis.views.revealImage.args.origin.bottomDropDown', {
        defaultMessage: 'Bottom',
      }),
    getOriginRight: () =>
      i18n.translate('xpack.canvas.uis.views.revealImage.args.origin.rightDropDown', {
        defaultMessage: 'Right',
      }),
  },
  Shape: {
    getDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.shapeTitle', {
        defaultMessage: 'Shape',
      }),
    getShapeDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.shape.args.shapeTitle', {
        defaultMessage: 'Select a shape',
      }),
    getFillDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.shape.args.fillTitle', {
        defaultMessage: 'Fill',
      }),
    getFillHelp: () =>
      i18n.translate('xpack.canvas.uis.views.shape.args.fillLabel', {
        defaultMessage: 'Accepts HEX, RGB or HTML Color names',
      }),
    getBorderDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.shape.args.borderTitle', {
        defaultMessage: 'Border',
      }),
    getBorderHelp: () =>
      i18n.translate('xpack.canvas.uis.views.shape.args.borderLabel', {
        defaultMessage: 'Accepts HEX, RGB or HTML Color names',
      }),
    getBorderWidthDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.shape.args.borderWidthTitle', {
        defaultMessage: 'Border width',
      }),
    getBorderWidthHelp: () =>
      i18n.translate('xpack.canvas.uis.views.shape.args.borderWidthLabel', {
        defaultMessage: 'Border width',
      }),
    getMaintainAspectDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.shape.args.maintainAspectTitle', {
        defaultMessage: 'Maintain aspect ratio',
      }),
    getMaintainAspectHelp: () =>
      i18n.translate('xpack.canvas.uis.views.shape.args.maintainAspectLabel', {
        defaultMessage: `Select '{true}' to maintain aspect ratio`,
        values: {
          true: BOOLEAN_TRUE,
        },
      }),
  },
  Table: {
    getDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.tableTitle', {
        defaultMessage: 'Table style',
      }),
    getHelp: () =>
      i18n.translate('xpack.canvas.uis.views.tableLabel', {
        defaultMessage: 'Set styling for a Table element',
      }),
    getPaginateDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.table.args.paginateTitle', {
        defaultMessage: 'Pagination',
      }),
    getPaginateHelp: () =>
      i18n.translate('xpack.canvas.uis.views.table.args.paginateLabel', {
        defaultMessage:
          'Show or hide pagination controls. If disabled only the first page will be shown',
      }),
    getPerPageDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.table.args.perPageTitle', {
        defaultMessage: 'Rows per page',
      }),
    getPerPageHelp: () =>
      i18n.translate('xpack.canvas.uis.views.table.args.perPageLabel', {
        defaultMessage: 'Number of rows to display per table page',
      }),
    getShowHeaderDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.table.args.showHeaderTitle', {
        defaultMessage: 'Header',
      }),
    getShowHeaderHelp: () =>
      i18n.translate('xpack.canvas.uis.views.table.args.showHeaderLabel', {
        defaultMessage: 'Show or hide the header row with titles for each column',
      }),
  },
  Timefilter: {
    getDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.timefilterTitle', {
        defaultMessage: 'Time filter',
      }),
    getColumnDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.timefilter.args.columnTitle', {
        defaultMessage: 'Column',
      }),
    getColumnHelp: () =>
      i18n.translate('xpack.canvas.uis.views.timefilter.args.columnLabel', {
        defaultMessage: 'Column to which selected time is applied',
      }),
    getColumnConfirm: () =>
      i18n.translate('xpack.canvas.uis.views.timefilter.args.columnConfirmButtonLabel', {
        defaultMessage: 'Set',
      }),
    getFilterGroupDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.timefilter.args.filterGroupTitle', {
        defaultMessage: 'Filter group name',
      }),
    getFilterGroupHelp: () =>
      i18n.translate('xpack.canvas.uis.views.timefilter.args.filterGroupLabel', {
        defaultMessage:
          "Apply the selected group name to an element's filters function to target this filter",
      }),
  },
};
