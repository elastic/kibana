/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
export function generateSharepointSearchWorkflow(stackConnectorId: string): string {
  return `version: '1'
name: 'sources.sharepoint.search'
description: 'Use this tool to run a Search query against SharePoint Online. Inputs: - query (string, can accept Keyword Query Language queries) - entityType (Any combination of site, list, listItem, drive or driveItem) - region (Search region (NAM=North America, EUR=Europe, APC=Asia Pacific, LAM=Latin America, MEA=Middle East/Africa), defaults to NAM). Outputs: - search response payload from Microsoft Graph.'
enabled: true
tags:
  - workflow
  - example
triggers:
  - type: 'manual'
inputs:
  - name: query
    type: string
    description: Search query
    required: true
  - name: entityTypes
    type: array
    default: ["site"]
    required: true
    description: The type of entity to search
  - name: region
    type: string
    default: NAM
    required: false
    description: The region (NAM, EUR, APC, LAM, MEA)
steps:
  - name: search-sharepoint
    type: sharepoint-online.search
    connector-id: ${stackConnectorId}
    with:
      query: "\${{inputs.query}}"
      entityTypes: \${{inputs.entityTypes}}
      region: "\${{inputs.region}}"
`;
}

export function generateSharepointGetAllSitesWorkflow(stackConnectorId: string): string {
  return `version: '1'
name: 'sources.sharepoint.get_all_sites'
description: 'List all SharePoint sites. Inputs: none. Outputs: - value (array of sites with id, displayName, webUrl, siteCollection) - @odata.nextLink (optional pagination URL).'
enabled: true
triggers:
  - type: 'manual'
steps:
  - name: get-all-sites
    type: sharepoint-online.getAllSites
    connector-id: ${stackConnectorId}
    with: {}
`;
}

export function generateSharepointGetSiteWorkflow(stackConnectorId: string): string {
  return `version: '1'
name: 'sources.sharepoint.get_site'
description: 'Get metadata for a SharePoint site by site ID. Inputs: - site_id (string). Outputs: - site details (id, displayName, webUrl, siteCollection, createdDateTime, lastModifiedDateTime).'
enabled: true
triggers:
  - type: 'manual'
inputs:
  - name: site_id
    type: string
steps:
  - name: get-site
    type: sharepoint-online.getSite
    connector-id: ${stackConnectorId}
    with:
      siteId: "\${{inputs.site_id}}"
`;
}

export function generateSharepointGetSitePagesWorkflow(stackConnectorId: string): string {
  return `version: '1'
name: 'sources.sharepoint.get_site_pages'
description: 'Use this tool to get all of the pages of a specific SharePoint Online site. Inputs: - site_id (string). Outputs: - value (array of pages with id, title, description, webUrl, createdDateTime, lastModifiedDateTime) - @odata.nextLink (optional pagination URL).'

enabled: true
tags:
  - workflow
  - example
triggers:
  - type: 'manual'
inputs:
  - name: site_id
    type: string
    required: true
    description: "The Site ID we want to get pages for"
steps:
  - name: get-site-pages
    type: sharepoint-online.getSitePages
    connector-id: ${stackConnectorId}
    with:
      siteId: "\${{inputs.site_id}}"
`;
}

export function generateSharepointGetSitePageContentsWorkflow(stackConnectorId: string): string {
  return `version: '1'
name: 'sources.sharepoint.get_site_page_contents'
description: 'Use this tool to get the contents of a particular site page. Inputs: - site_id (string) - page_id (string). Outputs: - page details including canvasLayout.'
enabled: true
triggers:
  - type: 'manual'
inputs:
  - name: site_id
    type: string
  - name: page_id
    type: string
steps:
  - name: get-site-page-contents
    type: sharepoint-online.getSitePageContents
    connector-id: ${stackConnectorId}
    with:
      siteId: "\${{inputs.site_id}}"
      pageId: "\${{inputs.page_id}}"
`;
}

export function generateSharepointGetSiteDrivesWorkflow(stackConnectorId: string): string {
  return `version: '1'
name: 'sources.sharepoint.get_site_drives'
description: 'List drives for a SharePoint site. Inputs: - site_id (string). Outputs: - value (array of drives with id, name, driveType, webUrl, createdDateTime, lastModifiedDateTime, description, owner) - @odata.nextLink (optional pagination URL).'
enabled: true
triggers:
  - type: 'manual'
inputs:
  - name: site_id
    type: string
steps:
  - name: get-site-drives
    type: sharepoint-online.getSiteDrives
    connector-id: ${stackConnectorId}
    with:
      siteId: "\${{inputs.site_id}}"
`;
}

export function generateSharepointGetSiteListsWorkflow(stackConnectorId: string): string {
  return `version: '1'
name: 'sources.sharepoint.get_site_lists'
description: 'List lists for a SharePoint site. Inputs: - site_id (string). Outputs: - value (array of lists with id, displayName, name, webUrl, description, createdDateTime, lastModifiedDateTime) - @odata.nextLink (optional pagination URL).'
enabled: true
triggers:
  - type: 'manual'
inputs:
  - name: site_id
    type: string
steps:
  - name: get-site-lists
    type: sharepoint-online.getSiteLists
    connector-id: ${stackConnectorId}
    with:
      siteId: "\${{inputs.site_id}}"
`;
}

export function generateSharepointGetSiteListItemsWorkflow(stackConnectorId: string): string {
  return `version: '1'
name: 'sources.sharepoint.get_site_list_items'
description: 'List items for a SharePoint list. Inputs: - site_id (string) - list_id (string). Outputs: - value (array of list items with id, webUrl, createdDateTime, lastModifiedDateTime, createdBy, lastModifiedBy) - @odata.nextLink (optional pagination URL).'
enabled: true
triggers:
  - type: 'manual'
inputs:
  - name: site_id
    type: string
  - name: list_id
    type: string
steps:
  - name: get-site-list-items
    type: sharepoint-online.getSiteListItems
    connector-id: ${stackConnectorId}
    with:
      siteId: "\${{inputs.site_id}}"
      listId: "\${{inputs.list_id}}"
`;
}

export function generateSharepointGetDriveItemsWorkflow(stackConnectorId: string): string {
  return `version: '1'
name: 'sources.sharepoint.get_drive_items'
description: 'List items in a SharePoint drive (optionally by path). Inputs: - drive_id (string) - path (string, optional). Outputs: - value (array of drive items with id, name, webUrl, createdDateTime, lastModifiedDateTime, size, downloadUrl) - @odata.nextLink (optional pagination URL).'
enabled: true
triggers:
  - type: 'manual'
inputs:
  - name: drive_id
    type: string
  - name: path
    type: string
    required: false
steps:
  - name: get-drive-items
    type: sharepoint-online.getDriveItems
    connector-id: ${stackConnectorId}
    with:
      driveId: "\${{inputs.drive_id}}"
      path: "\${{inputs.path}}"
`;
}

export function generateSharepointDownloadDriveItemWorkflow(stackConnectorId: string): string {
  return `version: '1'
name: 'sources.sharepoint.download_drive_item'
description: 'Download drive item content as text. Inputs: - drive_id (string) - item_id (string). Outputs: - contentType - contentLength - text (UTF-8 file content).'
enabled: true
triggers:
  - type: 'manual'
inputs:
  - name: drive_id
    type: string
  - name: item_id
    type: string
steps:
  - name: download-drive-item
    type: sharepoint-online.downloadDriveItem
    connector-id: ${stackConnectorId}
    with:
      driveId: "\${{inputs.drive_id}}"
      itemId: "\${{inputs.item_id}}"
`;
}

export function generateSharepointDownloadItemFromUrlWorkflow(stackConnectorId: string): string {
  return `version: '1'
name: 'sources.sharepoint.download_item_from_url'
description: 'Download item content from a SharePoint download URL. Inputs: - download_url (string). Outputs: - contentType - contentLength - text (UTF-8 file content).'
enabled: true
triggers:
  - type: 'manual'
inputs:
  - name: download_url
    type: string
steps:
  - name: download-item-from-url
    type: sharepoint-online.downloadItemFromURL
    connector-id: ${stackConnectorId}
    with:
      downloadUrl: "\${{inputs.download_url}}"
`;
}

export function generateSharepointCallGraphApiWorkflow(stackConnectorId: string): string {
  return `version: '1'
name: 'sources.sharepoint.call_graph_api'
description: 'Call a Microsoft Graph v1.0 endpoint by path. Inputs: - method (GET or POST) - path (string starting with /v1.0/) - body (optional). Outputs: - status - statusText - headers - data.'
enabled: true
triggers:
  - type: 'manual'
inputs:
  - name: method
    type: choice
    options:
      - "GET"
      - "POST"
  - name: path
    type: string
  - name: body
    type: string
    required: false
steps:
  - name: call-graph-api
    type: sharepoint-online.callGraphAPI
    connector-id: ${stackConnectorId}
    with:
      method: "\${{inputs.method}}"
      path: "\${{inputs.path}}"
      body: "\${{inputs.body}}"
`;
}
