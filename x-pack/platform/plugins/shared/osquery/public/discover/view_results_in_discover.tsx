/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { EuiButtonEmpty, EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FilterStateStore } from '@kbn/es-query';
import { useKibana } from '../common/lib/kibana';
import { useLogsDataView } from '../common/hooks/use_logs_data_view';
import { ViewResultsActionButtonType } from '../live_queries/form/pack_queries_status_table';

interface ViewResultsInDiscoverActionProps {
  actionId?: string;
  buttonType: ViewResultsActionButtonType;
  endDate?: string;
  startDate?: string;
  mode?: string;
}

const ViewResultsInDiscoverActionComponent: React.FC<ViewResultsInDiscoverActionProps> = ({
  actionId,
  buttonType,
  endDate,
  startDate,
}) => {
  const { discover, application } = useKibana().services;
  const locator = discover?.locator;
  const discoverPermissions = application.capabilities.discover_v2;
  const { data: logsDataView } = useLogsDataView({ skip: !actionId, checkOnly: true });

  const [discoverUrl, setDiscoverUrl] = useState<string>('');

  useEffect(() => {
    const getDiscoverUrl = async () => {
      if (!locator || !logsDataView) return;

      const newUrl = await locator.getUrl({
        indexPatternId: logsDataView.id,
        filters: [
          {
            meta: {
              index: logsDataView.id,
              alias: null,
              negate: false,
              disabled: false,
              type: 'phrase',
              key: 'action_id',
              params: { query: actionId },
            },
            query: { match_phrase: { action_id: actionId } },
            $state: { store: FilterStateStore.APP_STATE },
          },
        ],
        refreshInterval: {
          pause: true,
          value: 0,
        },
        timeRange:
          startDate && endDate
            ? {
                to: endDate,
                from: startDate,
                mode: 'absolute',
              }
            : {
                to: 'now',
                from: 'now-1d',
                mode: 'relative',
              },
      });
      setDiscoverUrl(newUrl);
    };

    getDiscoverUrl();
  }, [actionId, endDate, startDate, locator, logsDataView]);

  if (!discoverPermissions.show) {
    return null;
  }

  if (buttonType === ViewResultsActionButtonType.button) {
    return (
      <EuiButtonEmpty size="xs" iconType="discoverApp" href={discoverUrl} target="_blank">
        {VIEW_IN_DISCOVER}
      </EuiButtonEmpty>
    );
  }

  return (
    <EuiToolTip content={VIEW_IN_DISCOVER}>
      <EuiButtonIcon
        iconType="discoverApp"
        aria-label={VIEW_IN_DISCOVER}
        href={discoverUrl}
        target="_blank"
        isDisabled={!actionId || !discoverUrl.length}
      />
    </EuiToolTip>
  );
};

const VIEW_IN_DISCOVER = i18n.translate(
  'xpack.osquery.pack.queriesTable.viewDiscoverResultsActionAriaLabel',
  {
    defaultMessage: 'View in Discover',
  }
);

export const ViewResultsInDiscoverAction = React.memo(ViewResultsInDiscoverActionComponent);
