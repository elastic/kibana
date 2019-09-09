/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { URL, MARKDOWN } from '../../i18n';

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
};
