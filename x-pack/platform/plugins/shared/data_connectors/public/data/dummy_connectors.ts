/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Connector } from '../types/connector';

// TODO: This is temporary dummy data for "All" connectors section.
// "Popular" connectors are now populated from the connector registry.
export const DUMMY_CONNECTORS: Connector[] = [
  {
    id: 'google-drive',
    name: 'Google Drive',
    type: 'File import',
    icon: 'logoGoogleG',
    category: 'all',
  },
  {
    id: 'gmail',
    name: 'Gmail',
    type: 'Web crawler',
    icon: 'email',
    category: 'all',
  },
  {
    id: 'github',
    name: 'Github',
    type: 'Github',
    icon: 'logoGithub',
    category: 'all',
  },
  {
    id: 'asana',
    name: 'Asana',
    type: 'Web crawler',
    icon: 'apps',
    category: 'all',
  },
  {
    id: 'slack',
    name: 'Slack',
    type: 'Slack',
    icon: 'logoSlack',
    category: 'all',
  },
  {
    id: 'dropbox',
    name: 'Dropbox',
    type: 'File import',
    icon: 'document',
    category: 'all',
  },
  {
    id: 'hubspot',
    name: 'Hubspot',
    type: 'Web crawler',
    icon: 'database',
    category: 'all',
  },
  {
    id: 'sharepoint',
    name: 'Sharepoint',
    type: 'File import',
    icon: 'logoBusiness',
    category: 'all',
  },
  {
    id: 'airbnb',
    name: 'Airbnb',
    type: 'Web crawler',
    icon: 'globe',
    category: 'all',
  },
  {
    id: 'box',
    name: 'Box',
    type: 'File import',
    icon: 'folderClosed',
    category: 'all',
  },
  {
    id: 'intercom',
    name: 'Intercom',
    type: 'Web crawler',
    icon: 'discuss',
    category: 'all',
  },
  {
    id: 'monday',
    name: 'Monday',
    type: 'Web crawler',
    icon: 'calendar',
    category: 'all',
  },
  {
    id: 'snowflake',
    name: 'Snowflake',
    type: 'Snowflake',
    icon: 'database',
    category: 'all',
  },
  {
    id: 'workday',
    name: 'Workday',
    type: 'Web crawler',
    icon: 'users',
    category: 'all',
  },
];
