/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const mainTranslations = {
  pageTitle: i18n.translate('xpack.dataFederation.pageTitle', {
    defaultMessage: 'ES|QL Data Federation',
  }),

  pageDescription: i18n.translate('xpack.dataFederation.pageDescription', {
    defaultMessage:
      'Connect to external data sources and add specific datasets to query with ES|QL, just like your indexed data. No ingestion required.',
  }),

  experimental: i18n.translate('xpack.dataFederation.experimental', {
    defaultMessage: 'Experimental',
  }),

  docsLink: i18n.translate('xpack.dataFederation.docsLink', {
    defaultMessage: 'Learn more',
  }),

  flowPreview: {
    switchLabel: i18n.translate('xpack.dataFederation.flowPreviewSwitchLabel', {
      defaultMessage: 'Preview other creation flows',
    }),
  },

  columns: {
    dataSources: {
      name: i18n.translate('xpack.dataFederation.table.columnName', {
        defaultMessage: 'Name',
      }),
      type: i18n.translate('xpack.dataFederation.table.columnType', {
        defaultMessage: 'Type',
      }),
      dataSetsCount: i18n.translate('xpack.dataFederation.table.columnDataSetsCount', {
        defaultMessage: 'Datasets',
      }),
      status: i18n.translate('xpack.dataFederation.table.columnStatus', {
        defaultMessage: 'Status',
      }),
      connectionStatusConnected: i18n.translate(
        'xpack.dataFederation.table.connectionStatusConnected',
        {
          defaultMessage: 'Connected',
        }
      ),
      connectionStatusBroken: i18n.translate('xpack.dataFederation.table.connectionStatusBroken', {
        defaultMessage: 'Disconnected',
      }),
      connectionStatusChecking: i18n.translate(
        'xpack.dataFederation.table.connectionStatusChecking',
        {
          defaultMessage: 'Checking connection…',
        }
      ),
      description: i18n.translate('xpack.dataFederation.table.columnDescription', {
        defaultMessage: 'Description',
      }),
      enabled: i18n.translate('xpack.dataFederation.table.columnEnabled', {
        defaultMessage: 'Enabled',
      }),
      enabledToggleAriaLabel: (name: string) =>
        i18n.translate('xpack.dataFederation.table.enabledToggleAriaLabel', {
          defaultMessage: 'Enabled {name}',
          values: { name },
        }),
      actions: i18n.translate('xpack.dataFederation.table.columnActions', {
        defaultMessage: 'Actions',
      }),
      editAction: i18n.translate('xpack.dataFederation.table.editAction', {
        defaultMessage: 'Edit',
      }),
      editActionDescription: i18n.translate('xpack.dataFederation.table.editActionDescription', {
        defaultMessage: 'Edit data source',
      }),
      editActionUnsupportedTypeDescription: i18n.translate(
        'xpack.dataFederation.table.editActionUnsupportedTypeDescription',
        {
          defaultMessage: 'This data source type is not supported for editing in this view.',
        }
      ),
      deleteAction: i18n.translate('xpack.dataFederation.table.deleteAction', {
        defaultMessage: 'Delete',
      }),
      deleteActionDescription: i18n.translate(
        'xpack.dataFederation.table.deleteActionDescription',
        {
          defaultMessage: 'Delete data source',
        }
      ),
      deleteActionHasDataSetsDescription: i18n.translate(
        'xpack.dataFederation.table.deleteActionHasDataSetsDescription',
        {
          defaultMessage:
            'To delete a data source, you must first delete all datasets that read from it.',
        }
      ),
      viewDataSetsLinkAriaLabel: (count: number, dataSourceName: string) =>
        i18n.translate('xpack.dataFederation.table.viewDataSetsLinkAriaLabel', {
          defaultMessage: 'View {count} datasets for {dataSourceName}',
          values: { count, dataSourceName },
        }),
      caption: i18n.translate('xpack.dataFederation.table.caption', {
        defaultMessage: 'Data sources',
      }),
      noItems: i18n.translate('xpack.dataFederation.table.noItems', {
        defaultMessage:
          "You don't have any data sources yet. Connect to a data source to get started.",
      }),
      searchPlaceholder: i18n.translate('xpack.dataFederation.search.placeholder', {
        defaultMessage: 'Search data sources…',
      }),
    },
    dataSets: {
      name: i18n.translate('xpack.dataFederation.setsTable.columnName', {
        defaultMessage: 'Name',
      }),
      dataSourceId: i18n.translate('xpack.dataFederation.setsTable.columnDataSourceId', {
        defaultMessage: 'Data source',
      }),
      dataSourceType: i18n.translate('xpack.dataFederation.setsTable.columnDataSourceType', {
        defaultMessage: 'Data source type',
      }),
      dataSourceTypeMissing: i18n.translate(
        'xpack.dataFederation.setsTable.dataSourceTypeMissing',
        {
          defaultMessage: 'Unknown',
        }
      ),
      resource: i18n.translate('xpack.dataFederation.setsTable.columnResource', {
        defaultMessage: 'Resource',
      }),
      description: i18n.translate('xpack.dataFederation.setsTable.columnDescription', {
        defaultMessage: 'Description',
      }),
      enabled: i18n.translate('xpack.dataFederation.setsTable.columnEnabled', {
        defaultMessage: 'Enabled',
      }),
      enabledToggleAriaLabel: (name: string) =>
        i18n.translate('xpack.dataFederation.setsTable.enabledToggleAriaLabel', {
          defaultMessage: 'Enabled {name}',
          values: { name },
        }),
      enabledToggleDisabledBecauseDataSource: i18n.translate(
        'xpack.dataFederation.setsTable.enabledToggleDisabledBecauseDataSource',
        {
          defaultMessage: 'The data source is disabled, so this dataset cannot be enabled.',
        }
      ),
      actions: i18n.translate('xpack.dataFederation.setsTable.columnActions', {
        defaultMessage: 'Actions',
      }),
      editAction: i18n.translate('xpack.dataFederation.setsTable.editAction', {
        defaultMessage: 'Edit',
      }),
      editActionDescription: i18n.translate(
        'xpack.dataFederation.setsTable.editActionDescription',
        {
          defaultMessage: 'Edit dataset',
        }
      ),
      deleteAction: i18n.translate('xpack.dataFederation.setsTable.deleteAction', {
        defaultMessage: 'Delete',
      }),
      deleteActionDescription: i18n.translate(
        'xpack.dataFederation.setsTable.deleteActionDescription',
        {
          defaultMessage: 'Delete dataset',
        }
      ),
      cloneAction: i18n.translate('xpack.dataFederation.setsTable.cloneAction', {
        defaultMessage: 'Clone',
      }),
      cloneActionDescription: i18n.translate(
        'xpack.dataFederation.setsTable.cloneActionDescription',
        {
          defaultMessage: 'Clone dataset',
        }
      ),
      openInDiscoverAction: i18n.translate('xpack.dataFederation.setsTable.openInDiscoverAction', {
        defaultMessage: 'Open in Discover',
      }),
      openInDiscoverActionDescription: i18n.translate(
        'xpack.dataFederation.setsTable.openInDiscoverActionDescription',
        {
          defaultMessage: 'Open this dataset in Discover',
        }
      ),
      openInDiscoverDisabledBecauseDataset: i18n.translate(
        'xpack.dataFederation.setsTable.openInDiscoverDisabledBecauseDataset',
        {
          defaultMessage: 'This dataset is disabled, so it cannot be opened in Discover.',
        }
      ),
      moreActions: i18n.translate('xpack.dataFederation.setsTable.moreActions', {
        defaultMessage: 'More actions',
      }),
      caption: i18n.translate('xpack.dataFederation.setsTable.caption', {
        defaultMessage: 'Datasets',
      }),
      noItems: i18n.translate('xpack.dataFederation.setsTable.noItems', {
        defaultMessage: 'Add a dataset to start querying your data sources.',
      }),
      searchPlaceholder: i18n.translate('xpack.dataFederation.setsSearch.placeholder', {
        defaultMessage: 'Search datasets…',
      }),
      addButtonLabel: i18n.translate('xpack.dataFederation.setsAddButtonLabel', {
        defaultMessage: 'Add dataset',
      }),
      addMenuAriaLabel: i18n.translate('xpack.dataFederation.setsAddMenuAriaLabel', {
        defaultMessage: 'Add dataset flow options',
      }),
      addFlow1Label: i18n.translate('xpack.dataFederation.setsAddFlow1Label', {
        defaultMessage: 'Flow 1',
      }),
      addFlow2Label: i18n.translate('xpack.dataFederation.setsAddFlow2Label', {
        defaultMessage: 'Flow 2',
      }),
      addFlow3Label: i18n.translate('xpack.dataFederation.setsAddFlow3Label', {
        defaultMessage: 'Flow 3',
      }),
      addFlow396Label: i18n.translate('xpack.dataFederation.setsAddFlow396Label', {
        defaultMessage: 'Flow 3 9.6',
      }),
      addFlow4Label: i18n.translate('xpack.dataFederation.setsAddFlow4Label', {
        defaultMessage: 'Flow 4',
      }),
    },
  },

  tabs: {
    sets: i18n.translate('xpack.dataFederation.tabs.sets', {
      defaultMessage: 'Datasets',
    }),
    sources: i18n.translate('xpack.dataFederation.tabs.sources', {
      defaultMessage: 'Data sources',
    }),
  },

  actions: {
    deleteButtonLabel: i18n.translate('xpack.dataFederation.deleteButtonLabel', {
      defaultMessage: 'Delete',
    }),
    addButtonLabel: i18n.translate('xpack.dataFederation.addButtonLabel', {
      defaultMessage: 'Connect data source',
    }),
  },

  filters: {
    dataSource: i18n.translate('xpack.dataFederation.filters.dataSource', {
      defaultMessage: 'Data source',
    }),
    allDataSources: i18n.translate('xpack.dataFederation.filters.allDataSources', {
      defaultMessage: 'Data sources',
    }),
    dataSourceSearchPlaceholder: i18n.translate(
      'xpack.dataFederation.filters.dataSourceSearchPlaceholder',
      {
        defaultMessage: 'Filter options',
      }
    ),
  },

  connectionCheck: {
    progressText: (name: string) =>
      i18n.translate('xpack.dataFederation.connectionCheck.progressText', {
        defaultMessage: 'Checking whether Elasticsearch can reach {name}.',
        values: { name },
      }),
    successText: (name: string) =>
      i18n.translate('xpack.dataFederation.connectionCheck.successText', {
        defaultMessage: 'Elasticsearch can reach {name} with the settings you saved.',
        values: { name },
      }),
    errorText: (name: string) =>
      i18n.translate('xpack.dataFederation.connectionCheck.errorText', {
        defaultMessage:
          'Elasticsearch could not reach {name}. It is saved either way, so you can carry on and fix its settings whenever you are ready.',
        values: { name },
      }),
  },

  confirmDeleteDataSource: {
    title: i18n.translate('xpack.dataFederation.confirmDeleteDataSource.title', {
      defaultMessage: 'Delete data source',
    }),
    prompt: i18n.translate('xpack.dataFederation.confirmDeleteDataSource.prompt', {
      defaultMessage: 'Are you sure you want to delete this data source?',
    }),
    warning: i18n.translate('xpack.dataFederation.confirmDeleteDataSource.warning', {
      defaultMessage: 'This action cannot be undone.',
    }),
    cancelButton: i18n.translate('xpack.dataFederation.confirmDeleteDataSource.cancelButton', {
      defaultMessage: 'Cancel',
    }),
    confirmButton: i18n.translate('xpack.dataFederation.confirmDeleteDataSource.confirmButton', {
      defaultMessage: 'Delete',
    }),
    errorTitle: i18n.translate('xpack.dataFederation.confirmDeleteDataSource.errorTitle', {
      defaultMessage: 'Delete failed',
    }),
  },

  confirmDeleteDataSources: {
    title: i18n.translate('xpack.dataFederation.confirmDeleteDataSources.title', {
      defaultMessage: 'Delete data sources',
    }),
    prompt: (count: number) =>
      i18n.translate('xpack.dataFederation.confirmDeleteDataSources.prompt', {
        defaultMessage: 'Are you sure you want to delete {count} data sources?',
        values: { count },
      }),
    countLabel: (count: number) =>
      i18n.translate('xpack.dataFederation.confirmDeleteDataSources.countLabel', {
        defaultMessage: '{count} data sources selected',
        values: { count },
      }),
    warning: i18n.translate('xpack.dataFederation.confirmDeleteDataSources.warning', {
      defaultMessage: 'This action cannot be undone.',
    }),
    cancelButton: i18n.translate('xpack.dataFederation.confirmDeleteDataSources.cancelButton', {
      defaultMessage: 'Cancel',
    }),
    confirmButton: i18n.translate('xpack.dataFederation.confirmDeleteDataSources.confirmButton', {
      defaultMessage: 'Delete',
    }),
    errorTitle: i18n.translate('xpack.dataFederation.confirmDeleteDataSources.errorTitle', {
      defaultMessage: 'Delete failed',
    }),
    hasRelatedDataSetsError: i18n.translate(
      'xpack.dataFederation.confirmDeleteDataSources.hasRelatedDataSetsError',
      {
        defaultMessage:
          'Unable to delete one or more data sources because datasets read from them. Delete those datasets first.',
      }
    ),
  },

  confirmDeleteDataSet: {
    title: i18n.translate('xpack.dataFederation.confirmDeleteDataSet.title', {
      defaultMessage: 'Delete dataset',
    }),
    prompt: i18n.translate('xpack.dataFederation.confirmDeleteDataSet.prompt', {
      defaultMessage: 'Are you sure you want to delete this dataset?',
    }),
    warning: i18n.translate('xpack.dataFederation.confirmDeleteDataSet.warning', {
      defaultMessage: 'This action cannot be undone.',
    }),
    cancelButton: i18n.translate('xpack.dataFederation.confirmDeleteDataSet.cancelButton', {
      defaultMessage: 'Cancel',
    }),
    confirmButton: i18n.translate('xpack.dataFederation.confirmDeleteDataSet.confirmButton', {
      defaultMessage: 'Delete',
    }),
    errorTitle: i18n.translate('xpack.dataFederation.confirmDeleteDataSet.errorTitle', {
      defaultMessage: 'Delete failed',
    }),
  },

  confirmDeleteDataSets: {
    title: i18n.translate('xpack.dataFederation.confirmDeleteDataSets.title', {
      defaultMessage: 'Delete datasets',
    }),
    prompt: (count: number) =>
      i18n.translate('xpack.dataFederation.confirmDeleteDataSets.prompt', {
        defaultMessage: 'Are you sure you want to delete {count} datasets?',
        values: { count },
      }),
    warning: i18n.translate('xpack.dataFederation.confirmDeleteDataSets.warning', {
      defaultMessage: 'This action cannot be undone.',
    }),
    cancelButton: i18n.translate('xpack.dataFederation.confirmDeleteDataSets.cancelButton', {
      defaultMessage: 'Cancel',
    }),
    confirmButton: i18n.translate('xpack.dataFederation.confirmDeleteDataSets.confirmButton', {
      defaultMessage: 'Delete',
    }),
    errorTitle: i18n.translate('xpack.dataFederation.confirmDeleteDataSets.errorTitle', {
      defaultMessage: 'Delete failed',
    }),
  },
} as const;
