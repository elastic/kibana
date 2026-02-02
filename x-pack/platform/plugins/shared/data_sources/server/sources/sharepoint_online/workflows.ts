/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
export function generateSharepointListWorkflow(stackConnectorId: string): string {
  return `version: '1'
name: 'sources.sharepoint.list'
description: 'List/fetch SharePoint resources. Actions: getAllSites, getSite, getSitePages, getSiteDrives, getSiteLists, getSiteListItems, getDriveItems.'
enabled: true
triggers:
  - type: 'manual'
inputs:
  - name: list_action
    type: choice
    options:
      - "getAllSites"
      - "getSite"
      - "getSitePages"
      - "getSiteDrives"
      - "getSiteLists"
      - "getSiteListItems"
      - "getDriveItems"
  - name: site_id
    type: string
    required: false
  - name: relative_url
    type: string
    required: false
  - name: list_id
    type: string
    required: false
  - name: drive_id
    type: string
    required: false
  - name: path
    type: string
    required: false
steps:
  - name: get-all-sites
    type: sharepoint-online.getAllSites
    if: "\${{ inputs.list_action == 'getAllSites' }}"
    connector-id: ${stackConnectorId}
    with: {}
  - name: get-site-by-id
    type: sharepoint-online.getSite
    if: "\${{ inputs.list_action == 'getSite' && inputs.site_id }}"
    connector-id: ${stackConnectorId}
    with:
      siteId: "\${{ inputs.site_id }}"
  - name: get-site-by-relative-url
    type: sharepoint-online.getSite
    if: "\${{ inputs.list_action == 'getSite' && inputs.relative_url }}"
    connector-id: ${stackConnectorId}
    with:
      relativeUrl: "\${{ inputs.relative_url }}"
  - name: get-site-pages
    type: sharepoint-online.getSitePages
    if: "\${{ inputs.list_action == 'getSitePages' }}"
    connector-id: ${stackConnectorId}
    with:
      siteId: "\${{ inputs.site_id }}"
  - name: get-site-drives
    type: sharepoint-online.getSiteDrives
    if: "\${{ inputs.list_action == 'getSiteDrives' }}"
    connector-id: ${stackConnectorId}
    with:
      siteId: "\${{ inputs.site_id }}"
  - name: get-site-lists
    type: sharepoint-online.getSiteLists
    if: "\${{ inputs.list_action == 'getSiteLists' }}"
    connector-id: ${stackConnectorId}
    with:
      siteId: "\${{ inputs.site_id }}"
  - name: get-site-list-items
    type: sharepoint-online.getSiteListItems
    if: "\${{ inputs.list_action == 'getSiteListItems' }}"
    connector-id: ${stackConnectorId}
    with:
      siteId: "\${{ inputs.site_id }}"
      listId: "\${{ inputs.list_id }}"
  - name: get-drive-items
    type: sharepoint-online.getDriveItems
    if: "\${{ inputs.list_action == 'getDriveItems' }}"
    connector-id: ${stackConnectorId}
    with:
      driveId: "\${{ inputs.drive_id }}"
      path: "\${{ inputs.path }}"
`;
}

export function generateSharepointDownloadWorkflow(stackConnectorId: string): string {
  return `version: '1'
name: 'sources.sharepoint.download'
description: 'Download SharePoint content. Actions: downloadDriveItem, downloadItemFromURL, getSitePageContents.'
enabled: true
triggers:
  - type: 'manual'
inputs:
  - name: download_action
    type: choice
    options:
      - "downloadDriveItem"
      - "downloadItemFromURL"
      - "getSitePageContents"
  - name: site_id
    type: string
    required: false
  - name: page_id
    type: string
    required: false
  - name: drive_id
    type: string
    required: false
  - name: item_id
    type: string
    required: false
  - name: download_url
    type: string
    required: false
steps:
  - name: download-drive-item
    type: sharepoint-online.downloadDriveItem
    if: "\${{ inputs.download_action == 'downloadDriveItem' }}"
    connector-id: ${stackConnectorId}
    with:
      driveId: "\${{ inputs.drive_id }}"
      itemId: "\${{ inputs.item_id }}"
  - name: download-item-from-url
    type: sharepoint-online.downloadItemFromURL
    if: "\${{ inputs.download_action == 'downloadItemFromURL' }}"
    connector-id: ${stackConnectorId}
    with:
      downloadUrl: "\${{ inputs.download_url }}"
  - name: get-site-page-contents
    type: sharepoint-online.getSitePageContents
    if: "\${{ inputs.download_action == 'getSitePageContents' }}"
    connector-id: ${stackConnectorId}
    with:
      siteId: "\${{ inputs.site_id }}"
      pageId: "\${{ inputs.page_id }}"
`;
}

export function generateSharepointSearchWorkflow(stackConnectorId: string): string {
  return `version: '1'
name: 'sources.sharepoint.search'
description: 'Search SharePoint content with Microsoft Graph search. Actions: search. The query input accepts Keyword Query Language (KQL).'
enabled: true
triggers:
  - type: 'manual'
inputs:
  - name: query
    type: string
    required: true
  - name: entity_types
    type: array
    default:
      - "site"
    required: true
  - name: region
    type: string
    default: "NAM"
    required: false
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
      query: "\${{ inputs.query }}"
      entityTypes: \${{ inputs.entity_types }}
      region: "\${{ inputs.region }}"
      from: \${{ inputs.from }}
      size: \${{ inputs.size }}
`;
}
