/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
export function generateSharepointSearchWorkflow(stackConnectorId: string): string {
  return `version: '1'
name: 'sources.sharepoint.search'
description: 'Search SharePoint sites, lists, list items, and drive items by query'
enabled: true
triggers:
  - type: 'manual'
inputs:
  - name: query
    type: string
  - name: entity_types
    type: array
    default:
      - "site"
  - name: region
    type: string
    default: "NAM"
  - name: from
    type: number
    required: false
  - name: size
    type: number
    required: false
steps:
  - name: search-sharepoint
    type: sharepoint-online.search
    connector-id: ${stackConnectorId}
    with:
      query: "\${{inputs.query}}"
      entityTypes: \${{inputs.entity_types}}
      region: "\${{inputs.region}}"
      from: \${{inputs.from}}
      size: \${{inputs.size}}
`;
}

export function generateSharepointGetSiteWorkflow(stackConnectorId: string): string {
  return `version: '1'
name: 'sources.sharepoint.get_site'
description: 'Get metadata for a SharePoint site by site ID'
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
description: 'List pages for a SharePoint site'
enabled: true
triggers:
  - type: 'manual'
inputs:
  - name: site_id
    type: string
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
description: 'Get SharePoint site page contents including canvas layout'
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

export function generateSharepointGetDriveItemsWorkflow(stackConnectorId: string): string {
  return `version: '1'
name: 'sources.sharepoint.get_drive_items'
description: 'List items in a SharePoint drive (optionally by path)'
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

export function generateSharepointDownloadItemFromUrlWorkflow(stackConnectorId: string): string {
  return `version: '1'
name: 'sources.sharepoint.download_item_from_url'
description: 'Download item content from a SharePoint download URL'
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
