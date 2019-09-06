/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

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
};
