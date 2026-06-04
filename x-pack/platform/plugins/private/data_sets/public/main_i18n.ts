/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const mainTranslations = {
  columns: {
    dataSources: {
      name: i18n.translate('dataSets.table.columnName', {
        defaultMessage: 'name',
      }),
      type: i18n.translate('dataSets.table.columnType', {
        defaultMessage: 'Type',
      }),
      description: i18n.translate('dataSets.table.columnDescription', {
        defaultMessage: 'Description',
      }),
      actions: i18n.translate('dataSets.table.columnActions', {
        defaultMessage: 'Actions',
      }),
      editAction: i18n.translate('dataSets.table.editAction', {
        defaultMessage: 'Edit',
      }),
      editActionDescription: i18n.translate('dataSets.table.editActionDescription', {
        defaultMessage: 'Edit data source',
      }),
      caption: i18n.translate('dataSets.table.caption', {
        defaultMessage: 'Data sources',
      }),
      noItems: i18n.translate('dataSets.table.noItems', {
        defaultMessage: 'No data sources found',
      }),
      searchPlaceholder: i18n.translate('dataSets.search.placeholder', {
        defaultMessage: 'Search data sources…',
      }),
    },
    dataSets: {
      name: i18n.translate('dataSets.setsTable.columnName', {
        defaultMessage: 'Name',
      }),
      dataSourceId: i18n.translate('dataSets.setsTable.columnDataSourceId', {
        defaultMessage: 'Data source',
      }),
      dataSourceType: i18n.translate('dataSets.setsTable.columnDataSourceType', {
        defaultMessage: 'Data source type',
      }),
      dataSourceTypeMissing: i18n.translate('dataSets.setsTable.dataSourceTypeMissing', {
        defaultMessage: 'Unknown',
      }),
      resource: i18n.translate('dataSets.setsTable.columnResource', {
        defaultMessage: 'Resource',
      }),
      description: i18n.translate('dataSets.setsTable.columnDescription', {
        defaultMessage: 'Description',
      }),
      actions: i18n.translate('dataSets.setsTable.columnActions', {
        defaultMessage: 'Actions',
      }),
      editAction: i18n.translate('dataSets.setsTable.editAction', {
        defaultMessage: 'Edit',
      }),
      editActionDescription: i18n.translate('dataSets.setsTable.editActionDescription', {
        defaultMessage: 'Edit data set',
      }),
      caption: i18n.translate('dataSets.setsTable.caption', {
        defaultMessage: 'Data sets',
      }),
      noItems: i18n.translate('dataSets.setsTable.noItems', {
        defaultMessage: 'No data sets found',
      }),
      searchPlaceholder: i18n.translate('dataSets.setsSearch.placeholder', {
        defaultMessage: 'Search data sets…',
      }),
      addButtonLabel: i18n.translate('dataSets.setsAddButtonLabel', {
        defaultMessage: 'Add data set',
      }),
    },
  },

  tabs: {
    sets: i18n.translate('dataSets.tabs.sets', {
      defaultMessage: 'Data sets',
    }),
    sources: i18n.translate('dataSets.tabs.sources', {
      defaultMessage: 'Data sources',
    }),
  },

  actions: {
    deleteButtonLabel: i18n.translate('dataSets.deleteButtonLabel', {
      defaultMessage: 'Delete',
    }),
    addButtonLabel: i18n.translate('dataSets.addButtonLabel', {
      defaultMessage: 'Add data source',
    }),
  },
} as const;
