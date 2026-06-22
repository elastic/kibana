/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const mainTranslations = {
  pageTitle: i18n.translate('dataSets.pageTitle', {
    defaultMessage: 'ES|QL Data Federation',
  }),

  columns: {
    dataSources: {
      name: i18n.translate('dataSets.table.columnName', {
        defaultMessage: 'Name',
      }),
      type: i18n.translate('dataSets.table.columnType', {
        defaultMessage: 'Type',
      }),
      dataSetsCount: i18n.translate('dataSets.table.columnDataSetsCount', {
        defaultMessage: 'Data sets',
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
      deleteAction: i18n.translate('dataSets.table.deleteAction', {
        defaultMessage: 'Delete',
      }),
      deleteActionDescription: i18n.translate('dataSets.table.deleteActionDescription', {
        defaultMessage: 'Delete data source',
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
      deleteAction: i18n.translate('dataSets.setsTable.deleteAction', {
        defaultMessage: 'Delete',
      }),
      deleteActionDescription: i18n.translate('dataSets.setsTable.deleteActionDescription', {
        defaultMessage: 'Delete data set',
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
      defaultMessage: 'Connect data source',
    }),
  },

  filters: {
    dataSource: i18n.translate('dataSets.filters.dataSource', {
      defaultMessage: 'Data source',
    }),
    allDataSources: i18n.translate('dataSets.filters.allDataSources', {
      defaultMessage: 'All data sources',
    }),
  },

  confirmDeleteDataSource: {
    title: i18n.translate('dataSets.confirmDeleteDataSource.title', {
      defaultMessage: 'Delete data source',
    }),
    prompt: i18n.translate('dataSets.confirmDeleteDataSource.prompt', {
      defaultMessage: 'Are you sure you want to delete this data source?',
    }),
    warning: i18n.translate('dataSets.confirmDeleteDataSource.warning', {
      defaultMessage: 'This action cannot be undone.',
    }),
    cancelButton: i18n.translate('dataSets.confirmDeleteDataSource.cancelButton', {
      defaultMessage: 'Cancel',
    }),
    confirmButton: i18n.translate('dataSets.confirmDeleteDataSource.confirmButton', {
      defaultMessage: 'Delete',
    }),
    errorTitle: i18n.translate('dataSets.confirmDeleteDataSource.errorTitle', {
      defaultMessage: 'Delete failed',
    }),
  },

  confirmDeleteDataSet: {
    title: i18n.translate('dataSets.confirmDeleteDataSet.title', {
      defaultMessage: 'Delete data set',
    }),
    prompt: i18n.translate('dataSets.confirmDeleteDataSet.prompt', {
      defaultMessage: 'Are you sure you want to delete this data set?',
    }),
    warning: i18n.translate('dataSets.confirmDeleteDataSet.warning', {
      defaultMessage: 'This action cannot be undone.',
    }),
    cancelButton: i18n.translate('dataSets.confirmDeleteDataSet.cancelButton', {
      defaultMessage: 'Cancel',
    }),
    confirmButton: i18n.translate('dataSets.confirmDeleteDataSet.confirmButton', {
      defaultMessage: 'Delete',
    }),
    errorTitle: i18n.translate('dataSets.confirmDeleteDataSet.errorTitle', {
      defaultMessage: 'Delete failed',
    }),
  },
} as const;
