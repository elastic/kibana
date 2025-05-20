/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { niceTimeFormatter } from '@elastic/charts';
import { EuiButton, EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useAbortController } from '@kbn/react-hooks';
import { StreamQuery, StreamQueryKql, Streams } from '@kbn/streams-schema';
import React, { useCallback, useMemo, useState } from 'react';
import { lastValueFrom } from 'rxjs';
import { v4 } from 'uuid';
import { useFetchSignificantEvents } from '../../hooks/use_fetch_significant_events';
import { useKibana } from '../../hooks/use_kibana';
import { useSignificantEventsApi } from '../../hooks/use_significant_events_api';
import { useStreamsAppParams } from '../../hooks/use_streams_app_params';
import { useTimefilter } from '../../hooks/use_timefilter';
import { LoadingPanel } from '../loading_panel';
import { StreamsAppSearchBar } from '../streams_app_search_bar';
import { Timeline, TimelineEvent } from '../timeline';
import { formatChangePoint } from './change_point';
import { ChangePointSummary } from './change_point_summary';
import { SignificantEventsViewEmptyState } from './empty_state';
import { SignificantEventFlyout } from './significant_event_flyout';
import { SignificantEventsTable } from './significant_events_table';
import { SignificantEventSuggestionsFlyout } from './suggestions_flyout';

export function StreamDetailSignificantEventsView({
  definition,
}: {
  definition?: Streams.all.GetResponse;
}) {
  const {
    dependencies: {
      start: { streams, observabilityAIAssistant },
    },
    core: { notifications },
  } = useKibana();

  const {
    query: { kql },
  } = useStreamsAppParams('/{key}/*');

  const {
    timeState: { start, end },
  } = useTimefilter();

  const theme = useEuiTheme().euiTheme;

  const xFormatter = useMemo(() => {
    return niceTimeFormatter([start, end]);
  }, [start, end]);

  const significantEventsFetchState = useFetchSignificantEvents({
    name: definition?.stream.name,
    start,
    end,
    kql,
  });

  const { addQuery, bulk, removeQuery } =
    useSignificantEventsApi({ name: definition?.stream.name }) || {};

  const [isEditFlyoutOpen, setIsEditFlyoutOpen] = useState(false);

  const [isSuggestionFlyoutOpen, setIsSuggestionFlyoutOpen] = useState(false);

  const [queryToEdit, setQueryToEdit] = useState<StreamQueryKql | undefined>();

  const controller = useAbortController();

  const connectorId = observabilityAIAssistant?.useGenAIConnectors().selectedConnector;
  const name = definition?.stream.name;

  const [suggestedEvents, setSuggestedEvents] = useState<StreamQuery[]>([]);

  const generateEvents = useCallback(async () => {
    if (!name || !connectorId) {
      return undefined;
    }

    return lastValueFrom(
      streams.streamsRepositoryClient.stream(
        'GET /api/streams/{name}/significant_events/_generate',
        {
          signal: controller.signal,
          params: {
            path: {
              name,
            },
            query: {
              connectorId,
            },
          },
        }
      )
    )
      .then((event) => {
        setIsSuggestionFlyoutOpen(true);
        setSuggestedEvents(
          event.queries.map((suggestion) => {
            return {
              id: v4(),
              kql: {
                query: suggestion.kql,
              },
              title: suggestion.title,
            };
          })
        );
      })
      .catch((error) => {
        setSuggestedEvents([]);
        notifications.showErrorDialog({
          title: i18n.translate('xpack.streams.significantEvents.queryGenerationFailed', {
            defaultMessage: `Failed to generate queries`,
          }),
          error,
        });
      });
  }, [controller, streams.streamsRepositoryClient, name, connectorId, notifications]);

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
      name={definition?.stream.name ?? ''}
    />
  ) : null;

  const suggestionFlyout =
    name && isSuggestionFlyoutOpen ? (
      <SignificantEventSuggestionsFlyout
        name={name}
        suggestions={suggestedEvents}
        onAccept={async (next) => {
          await bulk?.(next.map((item) => ({ index: item })))
            .then(() => {
              significantEventsFetchState.refresh();
            })
            .finally(() => {
              setIsSuggestionFlyoutOpen(false);
            });
        }}
        onClose={() => {
          setSuggestedEvents([]);
          setIsSuggestionFlyoutOpen(false);
        }}
      />
    ) : null;

  if (significantEventsFetchState.value.length === 0) {
    return (
      <>
        <SignificantEventsViewEmptyState
          onGenerateClick={() => {
            return generateEvents();
          }}
          onAddClick={() => {
            setIsEditFlyoutOpen(true);
            setQueryToEdit(undefined);
          }}
        />
        {editFlyout}
        {suggestionFlyout}
      </>
    );
  }

  return (
    <>
      <EuiFlexGroup direction="column" gutterSize="l">
        <EuiFlexItem grow={false}>
          <EuiFlexGroup direction="row" gutterSize="s">
            <EuiFlexItem grow>
              <StreamsAppSearchBar
                query={kql}
                showQueryInput
                onQuerySubmit={() => {}}
                onQueryChange={() => {}}
              />
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
              </EuiButton>{' '}
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <Timeline start={start} end={end} events={events} xFormatter={xFormatter} />
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <SignificantEventsTable
            name={definition?.stream.name}
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
      {suggestionFlyout}
    </>
  );
}
