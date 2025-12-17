/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import type { RowControlColumn } from '@kbn/discover-utils';
import type { TimelinesUIStart } from '@kbn/timelines-plugin/public';
import { i18n } from '@kbn/i18n';

import { SECURITY_APP_NAME } from '../timelines/add_to_timeline_button';

interface RowActionsOptions {
  timelines: TimelinesUIStart | undefined;
  appName: string;
  liveQueryActionId: string | undefined;
  agentIds: string[] | undefined;
  startServices: {
    analytics: unknown;
    i18n: unknown;
    theme: unknown;
  };
}

const ADD_TO_TIMELINE_LABEL = i18n.translate(
  'xpack.osquery.resultsTable.rowAction.addToTimeline',
  { defaultMessage: 'Add to Timeline' }
);

export function useOsqueryRowActions({
  timelines,
  appName,
  startServices,
}: RowActionsOptions): RowControlColumn[] {
  const handleAddToTimeline = useCallback(
    (eventId: string) => {
      if (!timelines) return;

      const { getAddToTimelineButton } = timelines.getHoverActions();
      const providers = [
        {
          and: [],
          enabled: true,
          excluded: false,
          id: eventId,
          kqlQuery: '',
          name: eventId,
          queryMatch: {
            field: '_id',
            value: eventId,
            operator: ':' as const,
          },
        },
      ];

      const button = getAddToTimelineButton({
        dataProvider: providers,
        field: eventId,
        ownFocus: false,
        showTooltip: false,
        startServices,
      });

      if (button && React.isValidElement(button)) {
        const onClick = (button.props as { onClick?: () => void })?.onClick;
        onClick?.();
      }
    },
    [startServices, timelines]
  );

  return useMemo(() => {
    const columns: RowControlColumn[] = [];

    if (timelines && appName === SECURITY_APP_NAME) {
      columns.push({
        id: 'osquery-add-to-timeline',
        render: (Control, { record }) => (
          <Control
            iconType="timeline"
            label={ADD_TO_TIMELINE_LABEL}
            onClick={() => handleAddToTimeline(record.id)}
            data-test-subj="osquery-add-to-timeline-button"
          />
        ),
      });
    }

    return columns;
  }, [appName, handleAddToTimeline, timelines]);
}


