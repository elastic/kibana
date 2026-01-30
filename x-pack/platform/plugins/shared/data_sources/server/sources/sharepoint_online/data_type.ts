/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { DataSource } from '@kbn/data-catalog-plugin';
import {
  generateSharepointCallGraphApiWorkflow,
  generateSharepointDownloadItemFromUrlWorkflow,
  generateSharepointDownloadDriveItemWorkflow,
  generateSharepointGetAllSitesWorkflow,
  generateSharepointGetDriveItemsWorkflow,
  generateSharepointGetSiteDrivesWorkflow,
  generateSharepointGetSiteListItemsWorkflow,
  generateSharepointGetSiteListsWorkflow,
  generateSharepointGetSitePageContentsWorkflow,
  generateSharepointGetSitePagesWorkflow,
  generateSharepointGetSiteWorkflow,
  generateSharepointSearchWorkflow,
} from './workflows';

export const sharepointOnlineDataSource: DataSource = {
  id: 'sharepoint-online',
  name: 'SharePoint Online',
  description: i18n.translate('xpack.dataSources.sharepointOnline.description', {
    defaultMessage: 'Connect to SharePoint Online to search and retrieve site content.',
  }),

  iconType: '.sharepoint-online',

  stackConnector: {
    type: '.sharepoint-online',
    config: {},
  },

  generateWorkflows(stackConnectorId: string) {
    return [
      { content: generateSharepointSearchWorkflow(stackConnectorId), shouldGenerateABTool: true },
      { content: generateSharepointGetAllSitesWorkflow(stackConnectorId), shouldGenerateABTool: true },
      { content: generateSharepointGetSiteWorkflow(stackConnectorId), shouldGenerateABTool: true },
      { content: generateSharepointGetSitePagesWorkflow(stackConnectorId), shouldGenerateABTool: true },
      {
        content: generateSharepointGetSitePageContentsWorkflow(stackConnectorId),
        shouldGenerateABTool: true,
      },
      { content: generateSharepointGetSiteDrivesWorkflow(stackConnectorId), shouldGenerateABTool: true },
      { content: generateSharepointGetSiteListsWorkflow(stackConnectorId), shouldGenerateABTool: true },
      { content: generateSharepointGetSiteListItemsWorkflow(stackConnectorId), shouldGenerateABTool: true },
      { content: generateSharepointGetDriveItemsWorkflow(stackConnectorId), shouldGenerateABTool: true },
      { content: generateSharepointDownloadDriveItemWorkflow(stackConnectorId), shouldGenerateABTool: true },
      {
        content: generateSharepointDownloadItemFromUrlWorkflow(stackConnectorId),
        shouldGenerateABTool: true,
      },
      { content: generateSharepointCallGraphApiWorkflow(stackConnectorId), shouldGenerateABTool: true },
    ];
  },
};
