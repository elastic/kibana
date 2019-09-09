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
      i18n.translate('xpack.canvas.uis.arguments.filterGroup.displayName', {
        defaultMessage: 'Filter Group',
      }),
    getHelp: () =>
      i18n.translate('xpack.canvas.uis.arguments.filterGroup.help', {
        defaultMessage: 'Create or select a filter group',
      }),
    getCreateNewGroup: () =>
      i18n.translate('xpack.canvas.uis.arguments.filterGroup.create', {
        defaultMessage: 'Create new group',
      }),
  },
  ImageUpload: {
    getDisplayName: () =>
      i18n.translate('xpack.canvas.uis.arguments.imageUpload.displayName', {
        defaultMessage: 'Image upload',
      }),
    getHelp: () =>
      i18n.translate('xpack.canvas.uis.arguments.imageUpload.help', {
        defaultMessage: 'Select or upload an image',
      }),
    getImageUploading: () =>
      i18n.translate('xpack.canvas.uis.arguments.imageUpload.imageUploading', {
        defaultMessage: 'Image uploading',
      }),
    getFileUploadPrompt: () =>
      i18n.translate('xpack.canvas.uis.arguments.imageUpload.fileUploadPrompt', {
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
        i18n.translate('xpack.canvas.uis.arguments.imageUpload.urlTypes.file', {
          defaultMessage: 'Import',
        }),
      getLink: () =>
        i18n.translate('xpack.canvas.uis.arguments.imageUpload.urlTypes.link', {
          defaultMessage: 'Link',
        }),
      getAsset: () =>
        i18n.translate('xpack.canvas.uis.arguments.imageUpload.urlTypes.asset', {
          defaultMessage: 'Asset',
        }),
    },
  },
  Palette: {
    getDisplayName: () =>
      i18n.translate('xpack.canvas.uis.arguments.filterGroup.displayName', {
        defaultMessage: 'Color palette',
      }),
    getHelp: () =>
      i18n.translate('xpack.canvas.uis.arguments.filterGroup.help', {
        defaultMessage: 'Choose a color palette',
      }),
  },
};

export const ViewStrings = {
  DropdownControl: {
    getDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.dropdownControl.displayName', {
        defaultMessage: 'Dropdown filter',
      }),
    args: {
      valueColumn: {
        getDisplayName: () =>
          i18n.translate('xpack.canvas.uis.views.dropdownControl.args.valueColumn.displayName', {
            defaultMessage: 'Values column',
          }),
        getHelp: () =>
          i18n.translate('xpack.canvas.uis.views.dropdownControl.args.valueColumn.help', {
            defaultMessage: 'Column from which to extract values to make available in the dropdown',
          }),
      },
      filterColumn: {
        getDisplayName: () =>
          i18n.translate('xpack.canvas.uis.views.dropdownControl.args.filterColumn.displayName', {
            defaultMessage: 'Filter column',
          }),
        getHelp: () =>
          i18n.translate('xpack.canvas.uis.views.dropdownControl.args.filterColumn.help', {
            defaultMessage: 'Column to which the value selected from the dropdown is applied',
          }),
      },
      filterGroup: {
        getDisplayName: () =>
          i18n.translate('xpack.canvas.uis.views.dropdownControl.args.filterGroup.displayName', {
            defaultMessage: 'Filter group name',
          }),
        getHelp: () =>
          i18n.translate('xpack.canvas.uis.views.dropdownControl.args.filterGroup.help', {
            defaultMessage:
              "Apply the selected group name to an element's filters function to target this filter",
          }),
      },
    },
  },
  GetCell: {
    getDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.getCell.displayName', {
        defaultMessage: 'Dropdown filter',
      }),
    getHelp: () =>
      i18n.translate('xpack.canvas.uis.views.getCell.help', {
        defaultMessage: 'Grab the first row and first column',
      }),
  },
  Image: {
    getDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.image.displayName', {
        defaultMessage: 'Image',
      }),
    args: {
      mode: {
        getDisplayName: () =>
          i18n.translate('xpack.canvas.uis.views.image.args.mode.displayName', {
            defaultMessage: 'Fill mode',
          }),
        getHelp: () =>
          i18n.translate('xpack.canvas.uis.views.image.args.mode.help', {
            defaultMessage: 'Note: Stretched fill may not work with vector images',
          }),
        options: {
          contain: () =>
            i18n.translate('xpack.canvas.uis.views.image.args.mode.options.contain', {
              defaultMessage: 'Contain',
            }),
          cover: () =>
            i18n.translate('xpack.canvas.uis.views.image.args.mode.options.cover', {
              defaultMessage: 'Cover',
            }),
          stretch: () =>
            i18n.translate('xpack.canvas.uis.views.image.args.mode.options.stretch', {
              defaultMessage: 'Stretch',
            }),
        },
      },
    },
  },
  Markdown: {
    getDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.markdown.displayName', {
        defaultMessage: '{markdown}',
        values: {
          markdown: MARKDOWN,
        },
      }),
    getHelp: () =>
      i18n.translate('xpack.canvas.uis.views.markdown.help', {
        defaultMessage: 'Generate markup using {markdown}',
        values: {
          markdown: MARKDOWN,
        },
      }),
    args: {
      content: {
        getDisplayName: () =>
          i18n.translate('xpack.canvas.uis.views.markdown.args.content.displayName', {
            defaultMessage: '{markdown} content',
            values: {
              markdown: MARKDOWN,
            },
          }),
        getHelp: () =>
          i18n.translate('xpack.canvas.uis.views.markdown.args.content.help', {
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
      i18n.translate('xpack.canvas.uis.views.metric.displayName', {
        defaultMessage: 'Metric',
      }),
    args: {
      label: {
        getDisplayName: () =>
          i18n.translate('xpack.canvas.uis.views.metric.args.label.displayName', {
            defaultMessage: 'Label',
          }),
        getHelp: () =>
          i18n.translate('xpack.canvas.uis.views.metric.args.label.help', {
            defaultMessage: 'Describes the metric',
          }),
      },
      labelFont: {
        getDisplayName: () =>
          i18n.translate('xpack.canvas.uis.views.metric.args.labelFont.displayName', {
            defaultMessage: 'Label text settings',
          }),
        getHelp: () =>
          i18n.translate('xpack.canvas.uis.views.metric.args.labelFont.help', {
            defaultMessage: 'Fonts, alignment and color',
          }),
      },
      metricFont: {
        getDisplayName: () =>
          i18n.translate('xpack.canvas.uis.views.metric.args.metricFont.displayName', {
            defaultMessage: 'Metric text settings',
          }),
        getHelp: () =>
          i18n.translate('xpack.canvas.uis.views.metric.args.metricFont.help', {
            defaultMessage: 'Fonts, alignment and color',
          }),
      },
      metricFormat: {
        getDisplayName: () =>
          i18n.translate('xpack.canvas.uis.views.metric.args.metricFormat.displayName', {
            defaultMessage: 'Metric Format',
          }),
        getHelp: () =>
          i18n.translate('xpack.canvas.uis.views.metric.args.metricFormat.help', {
            defaultMessage: 'Fonts, alignment and color',
          }),
      },
    },
  },
  Pie: {
    getDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.pie.displayName', {
        defaultMessage: 'Chart style',
      }),
    args: {
      hole: {
        getDisplayName: () =>
          i18n.translate('xpack.canvas.uis.views.pie.args.hole.displayName', {
            defaultMessage: 'Inner radius',
          }),
        getHelp: () =>
          i18n.translate('xpack.canvas.uis.views.pie.args.hole.help', {
            defaultMessage: 'Radius of the hole',
          }),
      },
      labels: {
        getDisplayName: () =>
          i18n.translate('xpack.canvas.uis.views.pie.args.labels.displayName', {
            defaultMessage: 'Labels',
          }),
        getHelp: () =>
          i18n.translate('xpack.canvas.uis.views.pie.args.labels.help', {
            defaultMessage: 'Show/hide labels',
          }),
      },
      labelRadius: {
        getDisplayName: () =>
          i18n.translate('xpack.canvas.uis.views.pie.args.labelRadius.displayName', {
            defaultMessage: 'Label radius',
          }),
        getHelp: () =>
          i18n.translate('xpack.canvas.uis.views.pie.args.labelRadius.help', {
            defaultMessage: 'Distance of the labels from the center of the pie',
          }),
      },
      legend: {
        getDisplayName: () =>
          i18n.translate('xpack.canvas.uis.views.pie.args.legend.displayName', {
            defaultMessage: 'Legend position',
          }),
        getHelp: () =>
          i18n.translate('xpack.canvas.uis.views.pie.args.legend.help', {
            defaultMessage: 'Disable or position the legend',
          }),
      },
      radius: {
        getDisplayName: () =>
          i18n.translate('xpack.canvas.uis.views.pie.args.radius.displayName', {
            defaultMessage: 'Radius',
          }),
        getHelp: () =>
          i18n.translate('xpack.canvas.uis.views.pie.args.radius.help', {
            defaultMessage: 'Radius of the pie',
          }),
      },
      tilt: {
        getDisplayName: () =>
          i18n.translate('xpack.canvas.uis.views.pie.args.tilt.displayName', {
            defaultMessage: 'Tilt angle',
          }),
        getHelp: () =>
          i18n.translate('xpack.canvas.uis.views.pie.args.tilt.help', {
            defaultMessage:
              'Percentage of tilt where 100 is fully vertical and 0 is completely flat',
          }),
      },
    },
  },
  Plot: {
    getDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.plot.displayName', {
        defaultMessage: 'Chart style',
      }),
    args: {
      legend: {
        getDisplayName: () =>
          i18n.translate('xpack.canvas.uis.views.plot.args.legend.displayName', {
            defaultMessage: 'Legend position',
          }),
        getHelp: () =>
          i18n.translate('xpack.canvas.uis.views.plot.args.legend.help', {
            defaultMessage: 'Disable or position the legend',
          }),
      },
      xaxis: {
        getDisplayName: () =>
          i18n.translate('xpack.canvas.uis.views.plot.args.xaxis.displayName', {
            defaultMessage: 'X-axis',
          }),
        getHelp: () =>
          i18n.translate('xpack.canvas.uis.views.plot.args.xaxis.help', {
            defaultMessage: 'Configure or disable the x-axis',
          }),
      },
      yaxis: {
        getDisplayName: () =>
          i18n.translate('xpack.canvas.uis.views.plot.args.yaxis.displayName', {
            defaultMessage: 'Y-axis',
          }),
        getHelp: () =>
          i18n.translate('xpack.canvas.uis.views.plot.args.yaxis.help', {
            defaultMessage: 'Configure or disable the Y-axis',
          }),
      },
      defaultStyle: {
        getDisplayName: () =>
          i18n.translate('xpack.canvas.uis.views.plot.args.defaultStyle.displayName', {
            defaultMessage: 'Default style',
          }),
        getHelp: () =>
          i18n.translate('xpack.canvas.uis.views.plot.args.defaultStyle.help', {
            defaultMessage:
              'Set the style to be used by default by every series, unless overridden',
          }),
      },
    },
  },
  Progress: {
    getDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.progress.displayName', {
        defaultMessage: 'Progress',
      }),
    args: {
      Shape: {
        getDisplayName: () =>
          i18n.translate('xpack.canvas.uis.views.progress.args.shape.displayName', {
            defaultMessage: 'Shape',
          }),
        getHelp: () =>
          i18n.translate('xpack.canvas.uis.views.progress.args.shape.help', {
            defaultMessage: 'Shape of the progress indicator',
          }),
      },
      Max: {
        getDisplayName: () =>
          i18n.translate('xpack.canvas.uis.views.progress.args.max.displayName', {
            defaultMessage: 'Maximum value',
          }),
        getHelp: () =>
          i18n.translate('xpack.canvas.uis.views.progress.args.max.help', {
            defaultMessage: 'Maximum value of the progress element',
          }),
      },
      ValueColor: {
        getDisplayName: () =>
          i18n.translate('xpack.canvas.uis.views.progress.args.valueColor.displayName', {
            defaultMessage: 'Progress color',
          }),
        getHelp: () =>
          i18n.translate('xpack.canvas.uis.views.progress.args.valueColor.help', {
            defaultMessage: 'Accepts HEX, RGB or HTML Color names',
          }),
      },
      ValueWeight: {
        getDisplayName: () =>
          i18n.translate('xpack.canvas.uis.views.progress.args.valueWeight.displayName', {
            defaultMessage: 'Progress weight',
          }),
        getHelp: () =>
          i18n.translate('xpack.canvas.uis.views.progress.args.valueWeight.help', {
            defaultMessage: 'Thickness of the progress bar',
          }),
      },
      BarColor: {
        getDisplayName: () =>
          i18n.translate('xpack.canvas.uis.views.progress.args.barColor.displayName', {
            defaultMessage: 'Background color',
          }),
        getHelp: () =>
          i18n.translate('xpack.canvas.uis.views.progress.args.barColor.help', {
            defaultMessage: 'Accepts HEX, RGB or HTML Color names',
          }),
      },
      BarWeight: {
        getDisplayName: () =>
          i18n.translate('xpack.canvas.uis.views.progress.args.barWeight.displayName', {
            defaultMessage: 'Background weight',
          }),
        getHelp: () =>
          i18n.translate('xpack.canvas.uis.views.progress.args.barWeight.help', {
            defaultMessage: 'Thickness of the background bar',
          }),
      },
      Label: {
        getDisplayName: () =>
          i18n.translate('xpack.canvas.uis.views.progress.args.label.displayName', {
            defaultMessage: 'Label',
          }),
        getHelp: () =>
          i18n.translate('xpack.canvas.uis.views.progress.args.label.help', {
            defaultMessage: `Set true/false to show/hide label or provide a string to display as the label`,
          }),
      },
      Font: {
        getDisplayName: () =>
          i18n.translate('xpack.canvas.uis.views.progress.args.font.displayName', {
            defaultMessage: 'Label settings',
          }),
        getHelp: () =>
          i18n.translate('xpack.canvas.uis.views.progress.args.font.help', {
            defaultMessage:
              'Font settings for the label. Technically, you can add other styles as well',
          }),
      },
    },
  },
  Render: {
    getDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.render.displayName', {
        defaultMessage: 'Element style',
      }),
    getHelp: () =>
      i18n.translate('xpack.canvas.uis.views.render.help', {
        defaultMessage: 'Setting for the container around your element',
      }),
    args: {
      CSS: {
        getHelp: () =>
          i18n.translate('xpack.canvas.uis.views.render.args.css.help', {
            defaultMessage: 'A {css} stylesheet scoped to your element',
            values: {
              css: CSS,
            },
          }),
        getApply: () =>
          i18n.translate('xpack.canvas.uis.views.render.args.css.apply', {
            defaultMessage: 'Apply Stylesheet',
          }),
      },
    },
  },
  RepeatImage: {
    getDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.repeatImage.displayName', {
        defaultMessage: 'Repeating image',
      }),
    getHelp: () =>
      i18n.translate('xpack.canvas.uis.views.repeatImage.help', {
        defaultMessage: ' ',
      }),
    args: {
      Image: {
        getDisplayName: () =>
          i18n.translate('xpack.canvas.uis.views.repeatImage.args.image.displayName', {
            defaultMessage: 'Image',
          }),
        getHelp: () =>
          i18n.translate('xpack.canvas.uis.views.repeatImage.args.image.help', {
            defaultMessage: 'An image to repeat',
          }),
      },
      EmptyImage: {
        getDisplayName: () =>
          i18n.translate('xpack.canvas.uis.views.repeatImage.args.emptyImage.displayName', {
            defaultMessage: 'Empty image',
          }),
        getHelp: () =>
          i18n.translate('xpack.canvas.uis.views.repeatImage.args.emptyImage.help', {
            defaultMessage:
              'An image to fill up the difference between the value and the max count',
          }),
      },
      Size: {
        getDisplayName: () =>
          i18n.translate('xpack.canvas.uis.views.repeatImage.args.size.displayName', {
            defaultMessage: 'Image size',
          }),
        getHelp: () =>
          i18n.translate('xpack.canvas.uis.views.repeatImage.args.size.help', {
            defaultMessage:
              'The size of the largest dimension of the image. Eg, if the image is tall but not wide, this is the height',
          }),
      },
      Max: {
        getDisplayName: () =>
          i18n.translate('xpack.canvas.uis.views.repeatImage.args.max.displayName', {
            defaultMessage: 'Max count',
          }),
        getHelp: () =>
          i18n.translate('xpack.canvas.uis.views.repeatImage.args.max.help', {
            defaultMessage: 'The maximum number of repeated images',
          }),
      },
    },
  },
  RevealImage: {
    getDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.revealImage.displayName', {
        defaultMessage: 'Reveal image',
      }),
    getHelp: () =>
      i18n.translate('xpack.canvas.uis.views.revealImage.help', {
        defaultMessage: ' ',
      }),
    args: {
      Image: {
        getDisplayName: () =>
          i18n.translate('xpack.canvas.uis.views.revealImage.args.image.displayName', {
            defaultMessage: 'Image',
          }),
        getHelp: () =>
          i18n.translate('xpack.canvas.uis.views.revealImage.args.image.help', {
            defaultMessage: 'An image to reveal given the function input. Eg, a full glass',
          }),
      },
      EmptyImage: {
        getDisplayName: () =>
          i18n.translate('xpack.canvas.uis.views.revealImage.args.emptyImage.displayName', {
            defaultMessage: 'Background image',
          }),
        getHelp: () =>
          i18n.translate('xpack.canvas.uis.views.revealImage.args.emptyImage.help', {
            defaultMessage: 'A background image. Eg, an empty glass',
          }),
      },
      Origin: {
        getDisplayName: () =>
          i18n.translate('xpack.canvas.uis.views.revealImage.args.origin.displayName', {
            defaultMessage: 'Reveal from',
          }),
        getHelp: () =>
          i18n.translate('xpack.canvas.uis.views.revealImage.args.origin.help', {
            defaultMessage: 'The direction from which to start the reveal',
          }),
        getOptionTop: () =>
          i18n.translate('xpack.canvas.uis.views.revealImage.args.origin.options.top', {
            defaultMessage: 'Top',
          }),
        getOptionLeft: () =>
          i18n.translate('xpack.canvas.uis.views.revealImage.args.origin.options.left', {
            defaultMessage: 'Left',
          }),
        getOptionBottom: () =>
          i18n.translate('xpack.canvas.uis.views.revealImage.args.origin.options.bottom', {
            defaultMessage: 'Bottom',
          }),
        getOptionRight: () =>
          i18n.translate('xpack.canvas.uis.views.revealImage.args.origin.options.right', {
            defaultMessage: 'Right',
          }),
      },
    },
  },
  Shape: {
    getDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.shape.displayName', {
        defaultMessage: 'Shape',
      }),
    args: {
      Shape: {
        getDisplayName: () =>
          i18n.translate('xpack.canvas.uis.views.shape.args.shape.displayName', {
            defaultMessage: 'Select a shape',
          }),
      },
      Fill: {
        getDisplayName: () =>
          i18n.translate('xpack.canvas.uis.views.shape.args.fill.displayName', {
            defaultMessage: 'Fill',
          }),
        getHelp: () =>
          i18n.translate('xpack.canvas.uis.views.shape.args.fill.help', {
            defaultMessage: 'Accepts HEX, RGB or HTML Color names',
          }),
      },
      Border: {
        getDisplayName: () =>
          i18n.translate('xpack.canvas.uis.views.shape.args.border.displayName', {
            defaultMessage: 'Border',
          }),
        getHelp: () =>
          i18n.translate('xpack.canvas.uis.views.shape.args.border.help', {
            defaultMessage: 'Accepts HEX, RGB or HTML Color names',
          }),
      },
      BorderWidth: {
        getDisplayName: () =>
          i18n.translate('xpack.canvas.uis.views.shape.args.borderWidth.displayName', {
            defaultMessage: 'Border width',
          }),
        getHelp: () =>
          i18n.translate('xpack.canvas.uis.views.shape.args.borderWidth.help', {
            defaultMessage: 'Border width',
          }),
      },
      MaintainAspect: {
        getDisplayName: () =>
          i18n.translate('xpack.canvas.uis.views.shape.args.maintainAspect.displayName', {
            defaultMessage: 'Maintain aspect ratio',
          }),
        getHelp: () =>
          i18n.translate('xpack.canvas.uis.views.shape.args.maintainAspect.help', {
            defaultMessage: `Select 'true' to maintain aspect ratio`,
          }),
      },
    },
  },
};
