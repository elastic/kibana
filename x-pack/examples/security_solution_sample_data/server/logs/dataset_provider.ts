/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import path from 'path';
import { getSavedObjects } from './get_saved_objects';
import { fieldMappings } from './field_mappings';

export const logsDatasetProvider = ({ staticAssets }) => {
  console.log('logsDatasetProvider called');
  console.log(staticAssets);
  return {
    id: 'security-solution-logs',
    name: 'Security solution logs data',
    description: `Install data to drive security solution. To enable usage in security solution, add 'kibana_sample_data_security-solution-logs' to advanced setting 'securitySolution:defaultIndex'`,
    previewImagePath: staticAssets.getPluginAssetHref(
      '/sample_data_resources/flights/dashboard.webp'
    ),
    overviewDashboard: 'e0e5758b-18e0-4d1e-ad9e-b9e84bc8d4a2',
    defaultIndex: '7c532b57-d14f-42f2-a6a3-c8fde6af4522',
    savedObjects: getSavedObjects(),
    dataIndices: [
      {
        id: 'security-solution-logs',
        dataPath: path.join(__dirname, './logs.json.gz'),
        fields: fieldMappings,
        timeFields: ['@timestamp'],
        currentTimeMarker: '2024-04-22T00:00:00',
        preserveDayOfWeekTimeOfDay: true,
      },
    ],
    status: 'not_installed',
    iconPath: staticAssets.getPluginAssetHref('/sample_data_resources/flights/icon.svg'),
  };
};
