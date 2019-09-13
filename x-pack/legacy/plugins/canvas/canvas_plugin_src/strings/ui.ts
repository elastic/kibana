/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { CSS, URL, MARKDOWN } from '../../i18n';

export const ArgumentStrings = {
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
    urlTypes: {
      getFile: () =>
        i18n.translate('xpack.canvas.uis.arguments.imageUpload.urlTypes.fileDropDown', {
          defaultMessage: 'Import',
        }),
      getLink: () =>
        i18n.translate('xpack.canvas.uis.arguments.imageUpload.urlTypes.linkDropDown', {
          defaultMessage: 'Link',
        }),
      getAsset: () =>
        i18n.translate('xpack.canvas.uis.arguments.imageUpload.urlTypes.assetDropDown', {
          defaultMessage: 'Asset',
        }),
    },
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
};

export const ViewStrings = {
  DropdownControl: {
    getDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.dropdownControlTitle', {
        defaultMessage: 'Dropdown filter',
      }),
    args: {
      valueColumn: {
        getDisplayName: () =>
          i18n.translate('xpack.canvas.uis.views.dropdownControl.args.valueColumnTitle', {
            defaultMessage: 'Values column',
          }),
        getHelp: () =>
          i18n.translate('xpack.canvas.uis.views.dropdownControl.args.valueColumnLabel', {
            defaultMessage: 'Column from which to extract values to make available in the dropdown',
          }),
      },
      filterColumn: {
        getDisplayName: () =>
          i18n.translate('xpack.canvas.uis.views.dropdownControl.args.filterColumnTitle', {
            defaultMessage: 'Filter column',
          }),
        getHelp: () =>
          i18n.translate('xpack.canvas.uis.views.dropdownControl.args.filterColumnLabel', {
            defaultMessage: 'Column to which the value selected from the dropdown is applied',
          }),
      },
      filterGroup: {
        getDisplayName: () =>
          i18n.translate('xpack.canvas.uis.views.dropdownControl.args.filterGroupTitle', {
            defaultMessage: 'Filter group name',
          }),
        getHelp: () =>
          i18n.translate('xpack.canvas.uis.views.dropdownControl.args.filterGroupLabel', {
            defaultMessage:
              "Apply the selected group name to an element's filters function to target this filter",
          }),
      },
    },
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
    args: {
      mode: {
        getDisplayName: () =>
          i18n.translate('xpack.canvas.uis.views.image.args.modeTitle', {
            defaultMessage: 'Fill mode',
          }),
        getHelp: () =>
          i18n.translate('xpack.canvas.uis.views.image.args.modeLabel', {
            defaultMessage: 'Note: Stretched fill may not work with vector images',
          }),
        options: {
          contain: () =>
            i18n.translate('xpack.canvas.uis.views.image.args.mode.containDropDown', {
              defaultMessage: 'Contain',
            }),
          cover: () =>
            i18n.translate('xpack.canvas.uis.views.image.args.mode.coverDropDown', {
              defaultMessage: 'Cover',
            }),
          stretch: () =>
            i18n.translate('xpack.canvas.uis.views.image.args.mode.stretchDropDown', {
              defaultMessage: 'Stretch',
            }),
        },
      },
    },
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
    args: {
      content: {
        getDisplayName: () =>
          i18n.translate('xpack.canvas.uis.views.markdown.args.contentTitle', {
            defaultMessage: '{markdown} content',
            values: {
              markdown: MARKDOWN,
            },
          }),
        getHelp: () =>
          i18n.translate('xpack.canvas.uis.views.markdown.args.contentLabel', {
            defaultMessage: '{markdown} formatted text',
            values: {
              markdown: MARKDOWN,
            },
          }),
      },
    },
  },
  Metric: {
    getDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.metricTitle', {
        defaultMessage: 'Metric',
      }),
    args: {
      label: {
        getDisplayName: () =>
          i18n.translate('xpack.canvas.uis.views.metric.args.labelArgTitle', {
            defaultMessage: 'Label',
          }),
        getHelp: () =>
          i18n.translate('xpack.canvas.uis.views.metric.args.labelArgLabel', {
            defaultMessage: 'Describes the metric',
          }),
      },
      labelFont: {
        getDisplayName: () =>
          i18n.translate('xpack.canvas.uis.views.metric.args.labelFontTitle', {
            defaultMessage: 'Label text settings',
          }),
        getHelp: () =>
          i18n.translate('xpack.canvas.uis.views.metric.args.labelFontLabel', {
            defaultMessage: 'Fonts, alignment and color',
          }),
      },
      metricFont: {
        getDisplayName: () =>
          i18n.translate('xpack.canvas.uis.views.metric.args.metricFontTitle', {
            defaultMessage: 'Metric text settings',
          }),
        getHelp: () =>
          i18n.translate('xpack.canvas.uis.views.metric.args.metricFontLabel', {
            defaultMessage: 'Fonts, alignment and color',
          }),
      },
      metricFormat: {
        getDisplayName: () =>
          i18n.translate('xpack.canvas.uis.views.metric.args.metricFormatTitle', {
            defaultMessage: 'Metric Format',
          }),
        getHelp: () =>
          i18n.translate('xpack.canvas.uis.views.metric.args.metricFormatLabel', {
            defaultMessage: 'Fonts, alignment and color',
          }),
      },
    },
  },
  Pie: {
    getDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.pieTitle', {
        defaultMessage: 'Chart style',
      }),
    args: {
      hole: {
        getDisplayName: () =>
          i18n.translate('xpack.canvas.uis.views.pie.args.holeTitle', {
            defaultMessage: 'Inner radius',
          }),
        getHelp: () =>
          i18n.translate('xpack.canvas.uis.views.pie.args.holeLabel', {
            defaultMessage: 'Radius of the hole',
          }),
      },
      labels: {
        getDisplayName: () =>
          i18n.translate('xpack.canvas.uis.views.pie.args.labelsTitle', {
            defaultMessage: 'Labels',
          }),
        getHelp: () =>
          i18n.translate('xpack.canvas.uis.views.pie.args.labelsToggleSwitch', {
            defaultMessage: 'Show/hide labels',
          }),
      },
      labelRadius: {
        getDisplayName: () =>
          i18n.translate('xpack.canvas.uis.views.pie.args.labelRadiusTitle', {
            defaultMessage: 'Label radius',
          }),
        getHelp: () =>
          i18n.translate('xpack.canvas.uis.views.pie.args.labelRadiusLabel', {
            defaultMessage: 'Distance of the labels from the center of the pie',
          }),
      },
      legend: {
        getDisplayName: () =>
          i18n.translate('xpack.canvas.uis.views.pie.args.legendTitle', {
            defaultMessage: 'Legend position',
          }),
        getHelp: () =>
          i18n.translate('xpack.canvas.uis.views.pie.args.legendLabel', {
            defaultMessage: 'Disable or position the legend',
          }),
      },
      radius: {
        getDisplayName: () =>
          i18n.translate('xpack.canvas.uis.views.pie.args.radiusTitle', {
            defaultMessage: 'Radius',
          }),
        getHelp: () =>
          i18n.translate('xpack.canvas.uis.views.pie.args.radiusLabel', {
            defaultMessage: 'Radius of the pie',
          }),
      },
      tilt: {
        getDisplayName: () =>
          i18n.translate('xpack.canvas.uis.views.pie.args.tiltTitle', {
            defaultMessage: 'Tilt angle',
          }),
        getHelp: () =>
          i18n.translate('xpack.canvas.uis.views.pie.args.tiltLabel', {
            defaultMessage:
              'Percentage of tilt where 100 is fully vertical and 0 is completely flat',
          }),
      },
    },
  },
  Plot: {
    getDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.plotTitle', {
        defaultMessage: 'Chart style',
      }),
    args: {
      legend: {
        getDisplayName: () =>
          i18n.translate('xpack.canvas.uis.views.plot.args.legendTitle', {
            defaultMessage: 'Legend position',
          }),
        getHelp: () =>
          i18n.translate('xpack.canvas.uis.views.plot.args.legendLabel', {
            defaultMessage: 'Disable or position the legend',
          }),
      },
      xaxis: {
        getDisplayName: () =>
          i18n.translate('xpack.canvas.uis.views.plot.args.xaxisTitle', {
            defaultMessage: 'X-axis',
          }),
        getHelp: () =>
          i18n.translate('xpack.canvas.uis.views.plot.args.xaxisLabel', {
            defaultMessage: 'Configure or disable the x-axis',
          }),
      },
      yaxis: {
        getDisplayName: () =>
          i18n.translate('xpack.canvas.uis.views.plot.args.yaxisTitle', {
            defaultMessage: 'Y-axis',
          }),
        getHelp: () =>
          i18n.translate('xpack.canvas.uis.views.plot.args.yaxisLabel', {
            defaultMessage: 'Configure or disable the Y-axis',
          }),
      },
      defaultStyle: {
        getDisplayName: () =>
          i18n.translate('xpack.canvas.uis.views.plot.args.defaultStyleTitle', {
            defaultMessage: 'Default style',
          }),
        getHelp: () =>
          i18n.translate('xpack.canvas.uis.views.plot.args.defaultStyleLabel', {
            defaultMessage:
              'Set the style to be used by default by every series, unless overridden',
          }),
      },
    },
  },
  Progress: {
    getDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.progressTitle', {
        defaultMessage: 'Progress',
      }),
    args: {
      Shape: {
        getDisplayName: () =>
          i18n.translate('xpack.canvas.uis.views.progress.args.shapeTitle', {
            defaultMessage: 'Shape',
          }),
        getHelp: () =>
          i18n.translate('xpack.canvas.uis.views.progress.args.shapeLabel', {
            defaultMessage: 'Shape of the progress indicator',
          }),
      },
      Max: {
        getDisplayName: () =>
          i18n.translate('xpack.canvas.uis.views.progress.args.maxTitle', {
            defaultMessage: 'Maximum value',
          }),
        getHelp: () =>
          i18n.translate('xpack.canvas.uis.views.progress.args.maxLabel', {
            defaultMessage: 'Maximum value of the progress element',
          }),
      },
      ValueColor: {
        getDisplayName: () =>
          i18n.translate('xpack.canvas.uis.views.progress.args.valueColorTitle', {
            defaultMessage: 'Progress color',
          }),
        getHelp: () =>
          i18n.translate('xpack.canvas.uis.views.progress.args.valueColorLabel', {
            defaultMessage: 'Accepts HEX, RGB or HTML Color names',
          }),
      },
      ValueWeight: {
        getDisplayName: () =>
          i18n.translate('xpack.canvas.uis.views.progress.args.valueWeightTitle', {
            defaultMessage: 'Progress weight',
          }),
        getHelp: () =>
          i18n.translate('xpack.canvas.uis.views.progress.args.valueWeightLabel', {
            defaultMessage: 'Thickness of the progress bar',
          }),
      },
      BarColor: {
        getDisplayName: () =>
          i18n.translate('xpack.canvas.uis.views.progress.args.barColorTitle', {
            defaultMessage: 'Background color',
          }),
        getHelp: () =>
          i18n.translate('xpack.canvas.uis.views.progress.args.barColorLabel', {
            defaultMessage: 'Accepts HEX, RGB or HTML Color names',
          }),
      },
      BarWeight: {
        getDisplayName: () =>
          i18n.translate('xpack.canvas.uis.views.progress.args.barWeightTitle', {
            defaultMessage: 'Background weight',
          }),
        getHelp: () =>
          i18n.translate('xpack.canvas.uis.views.progress.args.barWeightLabel', {
            defaultMessage: 'Thickness of the background bar',
          }),
      },
      Label: {
        getDisplayName: () =>
          i18n.translate('xpack.canvas.uis.views.progress.args.labelArgTitle', {
            defaultMessage: 'Label',
          }),
        getHelp: () =>
          i18n.translate('xpack.canvas.uis.views.progress.args.labelArgLabel', {
            defaultMessage: `Set true/false to show/hide label or provide a string to display as the label`,
          }),
      },
      Font: {
        getDisplayName: () =>
          i18n.translate('xpack.canvas.uis.views.progress.args.fontTitle', {
            defaultMessage: 'Label settings',
          }),
        getHelp: () =>
          i18n.translate('xpack.canvas.uis.views.progress.args.fontLabel', {
            defaultMessage:
              'Font settings for the label. Technically, you can add other styles as well',
          }),
      },
    },
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
    args: {
      CSS: {
        getHelp: () =>
          i18n.translate('xpack.canvas.uis.views.render.args.cssLabel', {
            defaultMessage: 'A {css} stylesheet scoped to your element',
            values: {
              css: CSS,
            },
          }),
        getApply: () =>
          i18n.translate('xpack.canvas.uis.views.render.args.css.applyButtonLabel', {
            defaultMessage: 'Apply Stylesheet',
          }),
      },
    },
  },
  RepeatImage: {
    getDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.repeatImageTitle', {
        defaultMessage: 'Repeating image',
      }),
    getHelp: () =>
      i18n.translate('xpack.canvas.uis.views.repeatImageLabel', {
        defaultMessage: ' ',
      }),
    args: {
      Image: {
        getDisplayName: () =>
          i18n.translate('xpack.canvas.uis.views.repeatImage.args.imageTitle', {
            defaultMessage: 'Image',
          }),
        getHelp: () =>
          i18n.translate('xpack.canvas.uis.views.repeatImage.args.imageLabel', {
            defaultMessage: 'An image to repeat',
          }),
      },
      EmptyImage: {
        getDisplayName: () =>
          i18n.translate('xpack.canvas.uis.views.repeatImage.args.emptyImageTitle', {
            defaultMessage: 'Empty image',
          }),
        getHelp: () =>
          i18n.translate('xpack.canvas.uis.views.repeatImage.args.emptyImageLabel', {
            defaultMessage:
              'An image to fill up the difference between the value and the max count',
          }),
      },
      Size: {
        getDisplayName: () =>
          i18n.translate('xpack.canvas.uis.views.repeatImage.args.sizeTitle', {
            defaultMessage: 'Image size',
          }),
        getHelp: () =>
          i18n.translate('xpack.canvas.uis.views.repeatImage.args.sizeLabel', {
            defaultMessage:
              'The size of the largest dimension of the image. Eg, if the image is tall but not wide, this is the height',
          }),
      },
      Max: {
        getDisplayName: () =>
          i18n.translate('xpack.canvas.uis.views.repeatImage.args.maxTitle', {
            defaultMessage: 'Max count',
          }),
        getHelp: () =>
          i18n.translate('xpack.canvas.uis.views.repeatImage.args.maxLabel', {
            defaultMessage: 'The maximum number of repeated images',
          }),
      },
    },
  },
  RevealImage: {
    getDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.revealImageTitle', {
        defaultMessage: 'Reveal image',
      }),
    getHelp: () =>
      i18n.translate('xpack.canvas.uis.views.revealImageLabel', {
        defaultMessage: ' ',
      }),
    args: {
      Image: {
        getDisplayName: () =>
          i18n.translate('xpack.canvas.uis.views.revealImage.args.imageTitle', {
            defaultMessage: 'Image',
          }),
        getHelp: () =>
          i18n.translate('xpack.canvas.uis.views.revealImage.args.imageLabel', {
            defaultMessage: 'An image to reveal given the function input. Eg, a full glass',
          }),
      },
      EmptyImage: {
        getDisplayName: () =>
          i18n.translate('xpack.canvas.uis.views.revealImage.args.emptyImageTitle', {
            defaultMessage: 'Background image',
          }),
        getHelp: () =>
          i18n.translate('xpack.canvas.uis.views.revealImage.args.emptyImageLabel', {
            defaultMessage: 'A background image. Eg, an empty glass',
          }),
      },
      Origin: {
        getDisplayName: () =>
          i18n.translate('xpack.canvas.uis.views.revealImage.args.originTitle', {
            defaultMessage: 'Reveal from',
          }),
        getHelp: () =>
          i18n.translate('xpack.canvas.uis.views.revealImage.args.originLabel', {
            defaultMessage: 'The direction from which to start the reveal',
          }),
        getOptionTop: () =>
          i18n.translate('xpack.canvas.uis.views.revealImage.args.origin.topDropDown', {
            defaultMessage: 'Top',
          }),
        getOptionLeft: () =>
          i18n.translate('xpack.canvas.uis.views.revealImage.args.origin.leftDropDown', {
            defaultMessage: 'Left',
          }),
        getOptionBottom: () =>
          i18n.translate('xpack.canvas.uis.views.revealImage.args.origin.bottomDropDown', {
            defaultMessage: 'Bottom',
          }),
        getOptionRight: () =>
          i18n.translate('xpack.canvas.uis.views.revealImage.args.origin.rightDropDown', {
            defaultMessage: 'Right',
          }),
      },
    },
  },
  Shape: {
    getDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.shapeTitle', {
        defaultMessage: 'Shape',
      }),
    args: {
      Shape: {
        getDisplayName: () =>
          i18n.translate('xpack.canvas.uis.views.shape.args.shapeTitle', {
            defaultMessage: 'Select a shape',
          }),
      },
      Fill: {
        getDisplayName: () =>
          i18n.translate('xpack.canvas.uis.views.shape.args.fillTitle', {
            defaultMessage: 'Fill',
          }),
        getHelp: () =>
          i18n.translate('xpack.canvas.uis.views.shape.args.fillLabel', {
            defaultMessage: 'Accepts HEX, RGB or HTML Color names',
          }),
      },
      Border: {
        getDisplayName: () =>
          i18n.translate('xpack.canvas.uis.views.shape.args.borderTitle', {
            defaultMessage: 'Border',
          }),
        getHelp: () =>
          i18n.translate('xpack.canvas.uis.views.shape.args.borderLabel', {
            defaultMessage: 'Accepts HEX, RGB or HTML Color names',
          }),
      },
      BorderWidth: {
        getDisplayName: () =>
          i18n.translate('xpack.canvas.uis.views.shape.args.borderWidthTitle', {
            defaultMessage: 'Border width',
          }),
        getHelp: () =>
          i18n.translate('xpack.canvas.uis.views.shape.args.borderWidthLabel', {
            defaultMessage: 'Border width',
          }),
      },
      MaintainAspect: {
        getDisplayName: () =>
          i18n.translate('xpack.canvas.uis.views.shape.args.maintainAspectTitle', {
            defaultMessage: 'Maintain aspect ratio',
          }),
        getHelp: () =>
          i18n.translate('xpack.canvas.uis.views.shape.args.maintainAspectLabel', {
            defaultMessage: `Select 'true' to maintain aspect ratio`,
          }),
      },
    },
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
    args: {
      Paginate: {
        getDisplayName: () =>
          i18n.translate('xpack.canvas.uis.views.table.args.paginateTitle', {
            defaultMessage: 'Pagination',
          }),
        getHelp: () =>
          i18n.translate('xpack.canvas.uis.views.table.args.paginateLabel', {
            defaultMessage:
              'Show or hide pagination controls. If disabled only the first page will be shown',
          }),
      },
      PerPage: {
        getDisplayName: () =>
          i18n.translate('xpack.canvas.uis.views.table.args.perPageTitle', {
            defaultMessage: 'Rows per page',
          }),
        getHelp: () =>
          i18n.translate('xpack.canvas.uis.views.table.args.perPageLabel', {
            defaultMessage: 'Number of rows to display per table page',
          }),
      },
      ShowHeader: {
        getDisplayName: () =>
          i18n.translate('xpack.canvas.uis.views.table.args.showHeaderTitle', {
            defaultMessage: 'Header',
          }),
        getHelp: () =>
          i18n.translate('xpack.canvas.uis.views.table.args.showHeaderLabel', {
            defaultMessage: 'Show or hide the header row with titles for each column',
          }),
      },
    },
  },
  Timefilter: {
    getDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.timefilterTitle', {
        defaultMessage: 'Time filter',
      }),

    args: {
      Column: {
        getDisplayName: () =>
          i18n.translate('xpack.canvas.uis.views.table.args.columnTitle', {
            defaultMessage: 'Column',
          }),
        getHelp: () =>
          i18n.translate('xpack.canvas.uis.views.table.args.columnLabel', {
            defaultMessage: 'Column to which selected time is applied',
          }),
        getConfirm: () =>
          i18n.translate('xpack.canvas.uis.views.table.args.columnConfirmButtonLabel', {
            defaultMessage: 'Set',
          }),
      },
      FilterGroup: {
        getDisplayName: () =>
          i18n.translate('xpack.canvas.uis.views.table.args.filterGroupTitle', {
            defaultMessage: 'Filter group name',
          }),
        getHelp: () =>
          i18n.translate('xpack.canvas.uis.views.table.args.filterGroupLabel', {
            defaultMessage:
              "Apply the selected group name to an element's filters function to target this filter",
          }),
      },
    },
  },
};
