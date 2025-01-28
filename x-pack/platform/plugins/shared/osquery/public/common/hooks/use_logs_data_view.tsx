/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import type { DataView } from '@kbn/data-plugin/common';

import { useKibana } from '../lib/kibana';

export interface LogsDataView extends DataView {
  id: string;
}

interface UseLogsDataView {
  skip?: boolean;
  /*
    this flag is used to retrieve the persistent logs data view
    and should be used only for external links, eg. discover, lens
  */
  checkOnly?: boolean;
}

export const useLogsDataView = (payload?: UseLogsDataView) => {
  const dataViews = useKibana().services.data.dataViews;

  return useQuery<LogsDataView | undefined>(
    ['logsDataView'],
    async () => {
      let dataView;
      try {
        const data = await dataViews.find('logs-osquery_manager.result*', 1);
        if (data.length) {
          dataView = data[0];
        } else {
          throw new Error('No data view found');
        }
        // eslint-disable-next-line no-empty
      } catch (e) {}

      if (!dataView && dataViews.getCanSaveSync()) {
        try {
          dataView = await dataViews.createAndSave({
            title: 'logs-osquery_manager.result*',
            timeFieldName: '@timestamp',
          });
          // eslint-disable-next-line no-empty
        } catch (e) {}
      }

      if (!dataView && !payload?.checkOnly) {
        try {
          dataView = await dataViews.create({
            title: 'logs-osquery_manager.result*',
            timeFieldName: '@timestamp',
          });
          // eslint-disable-next-line no-empty
        } catch (e) {}
      }

      return dataView as LogsDataView;
    },
    {
      enabled: !payload?.skip,
      retry: 1,
    }
  );
};
