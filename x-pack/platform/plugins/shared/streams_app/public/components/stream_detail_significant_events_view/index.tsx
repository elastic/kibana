/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { niceTimeFormatter } from '@elastic/charts';
import { EuiButton, EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { StreamQueryKql, Streams } from '@kbn/streams-schema';
import React, { useMemo, useState } from 'react';
import { useFetchSignificantEvents } from '../../hooks/use_fetch_significant_events';
import { useKibana } from '../../hooks/use_kibana';
import { useSignificantEventsApi } from '../../hooks/use_significant_events_api';
import { useTimefilter } from '../../hooks/use_timefilter';
import { LoadingPanel } from '../loading_panel';
import { StreamsAppSearchBar } from '../streams_app_search_bar';
import { Timeline, TimelineEvent } from '../timeline';
import { formatChangePoint } from './change_point';
import { ChangePointSummary } from './change_point_summary';
import { SignificantEventsViewEmptyState } from './empty_state';
import { SignificantEventFlyout } from './significant_event_flyout';
import { SignificantEventsTable } from './significant_events_table';

export function StreamDetailSignificantEventsView({
  definition,
  refreshDefinition,
}: {
  definition: Streams.all.GetResponse;
  refreshDefinition: () => void;
}) {
  const {
    core: { notifications },
  } = useKibana();

  const {
    timeState: { start, end },
  } = useTimefilter();

  const theme = useEuiTheme().euiTheme;

  const xFormatter = useMemo(() => {
    return niceTimeFormatter([start, end]);
  }, [start, end]);

  const significantEventsFetchState = useFetchSignificantEvents({
    name: definition.stream.name,
    start,
    end,
  });

  const { addQuery, removeQuery } = useSignificantEventsApi({ name: definition.stream.name }) || {};

  const [isEditFlyoutOpen, setIsEditFlyoutOpen] = useState(false);

  const [queryToEdit, setQueryToEdit] = useState<StreamQueryKql | undefined>();

  const events = useMemo(() => {
    return (
      significantEventsFetchState.value?.flatMap((item): TimelineEvent[] => {
        const change = formatChangePoint(item);

        if (!change) {
          return [];
        }

        return [
          {
            id: item.query.id,
            label: <ChangePointSummary change={change} xFormatter={xFormatter} />,
            color: theme.colors[change.color],
            time: change.time,
            header: item.query.title,
          },
        ];
      }) ?? []
    );
  }, [significantEventsFetchState.value, theme, xFormatter]);

  if (!significantEventsFetchState.value) {
    return <LoadingPanel />;
  }

  const editFlyout = isEditFlyoutOpen ? (
    <SignificantEventFlyout
      onCreate={async (next) => {
        await addQuery?.(next).then(
          () => {
            notifications.toasts.addSuccess({
              title: i18n.translate(
                'xpack.streams.significantEvents.significantEventCreateSuccessToastTitle',
                {
                  defaultMessage: `Added significant event`,
                }
              ),
            });
            setIsEditFlyoutOpen(false);
            significantEventsFetchState.refresh();
          },
          (error) => {
            notifications.showErrorDialog({
              title: i18n.translate(
                'xpack.streams.significantEvents.significantEventCreateErrorToastTitle',
                {
                  defaultMessage: `Could not add significant event`,
                }
              ),
              error,
            });
          }
        );
      }}
      onUpdate={async (next) => {
        await addQuery?.(next).then(
          () => {
            notifications.toasts.addSuccess({
              title: i18n.translate(
                'xpack.streams.significantEvents.significantEventUpdateSuccessToastTitle',
                {
                  defaultMessage: `Updated significant event`,
                }
              ),
            });
            setIsEditFlyoutOpen(false);
            significantEventsFetchState.refresh();
          },
          (error) => {
            notifications.showErrorDialog({
              title: i18n.translate(
                'xpack.streams.significantEvents.significantEventUpdateErrorToastTitle',
                {
                  defaultMessage: `Could not update significant event`,
                }
              ),
              error,
            });
          }
        );
      }}
      onClose={() => {
        setIsEditFlyoutOpen(false);
        setQueryToEdit(undefined);
      }}
      query={queryToEdit}
      name={definition.stream.name}
    />
  ) : null;

  if (significantEventsFetchState.value.length === 0) {
    return (
      <>
        <SignificantEventsViewEmptyState
          onAddClick={() => {
            setIsEditFlyoutOpen(true);
            setQueryToEdit(undefined);
          }}
        />
        {editFlyout}
      </>
    );
  }

  return (
    <>
      <EuiFlexGroup direction="column" gutterSize="l">
        <EuiFlexItem grow={false}>
          <EuiFlexGroup direction="row" gutterSize="s">
            <EuiFlexItem grow>
              <StreamsAppSearchBar showQueryInput={false} showDatePicker />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                color="primary"
                onClick={() => {
                  setIsEditFlyoutOpen(true);
                  setQueryToEdit(undefined);
                }}
                iconType="plusInCircle"
              >
                {i18n.translate('xpack.streams.significantEvents.addSignificantEventButton', {
                  defaultMessage: 'Add significant event query',
                })}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <Timeline start={start} end={end} events={events} xFormatter={xFormatter} />
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <SignificantEventsTable
            definition={definition.stream}
            response={significantEventsFetchState}
            onEditClick={(item) => {
              setIsEditFlyoutOpen(true);
              setQueryToEdit(item.query);
            }}
            onDeleteClick={async (item) => {
              await removeQuery?.(item.query.id).then(() => {
                significantEventsFetchState.refresh();
              });
            }}
            xFormatter={xFormatter}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      {editFlyout}
    </>
  );
}
