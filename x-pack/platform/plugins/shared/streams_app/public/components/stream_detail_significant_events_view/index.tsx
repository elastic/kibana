/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiSpacer, useEuiTheme } from '@elastic/eui';
import { IngestStreamGetResponse, StreamQuery, StreamQueryKql } from '@kbn/streams-schema';
import React, { useCallback, useMemo, useState } from 'react';
import { niceTimeFormatter } from '@elastic/charts';
import { omit } from 'lodash';
import { i18n } from '@kbn/i18n';
import { useAbortController } from '@kbn/react-hooks';
import { lastValueFrom } from 'rxjs';
import { v4 } from 'uuid';
import { useFetchSignificantEvents } from '../../hooks/use_fetch_significant_events';
import { useKibana } from '../../hooks/use_kibana';
import { StreamsAppSearchBar } from '../streams_app_search_bar';
import { SignificantEventsTable } from './significant_events_table';
import { SignificantEventFlyout } from './significant_event_flyout';
import { Timeline, TimelineEvent } from '../timeline';
import { formatChangePoint } from './change_point';
import { ChangePointSummary } from './change_point_summary';
import { useTimefilter } from '../../hooks/use_timefilter';
import { useStreamsAppParams } from '../../hooks/use_streams_app_params';
import { useStreamsAppRouter } from '../../hooks/use_streams_app_router';
import { useStreamsAppRoutePath } from '../../hooks/use_streams_app_route_path';
import { LoadingPanel } from '../loading_panel';
import { SignificantEventsViewEmptyState } from './empty_state';
import { SignificantEventSuggestionsFlyout } from './suggestions_flyout';

export function StreamDetailSignificantEventsView({
  definition,
}: {
  definition?: IngestStreamGetResponse;
}) {
  const {
    dependencies: {
      start: { streams, observabilityAIAssistant },
    },
    core: { notifications },
  } = useKibana();

  const {
    path,
    query,
    query: { kql },
  } = useStreamsAppParams('/{key}/*');

  const streamsAppRouter = useStreamsAppRouter();

  const routePath = useStreamsAppRoutePath();

  const {
    timeRange,
    setTimeRange,
    absoluteTimeRange: { start, end },
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

  const [isEditFlyoutOpen, setIsEditFlyoutOpen] = useState(false);

  const [isSuggestionFlyoutOpen, setIsSuggestionFlyoutOpen] = useState(false);

  const [isSuggestionsLoading, setIsSuggestionsLoading] = useState(false);

  const [queryToEdit, setQueryToEdit] = useState<StreamQueryKql | undefined>();

  const controller = useAbortController();

  const connectorId = observabilityAIAssistant?.useGenAIConnectors().selectedConnector;
  const name = definition?.stream.name;

  const [suggestedEvents, setSuggestedEvents] = useState<StreamQuery[]>([]);

  const generateEvents = useCallback(async () => {
    if (!name || !connectorId) {
      return undefined;
    }

    setIsSuggestionFlyoutOpen(true);
    setIsSuggestionsLoading(true);

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
      })
      .finally(() => {
        setIsSuggestionsLoading(false);
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

  if (!suggestedEvents.length && events.length === 0) {
    return (
      <SignificantEventsViewEmptyState
        onGenerateClick={() => {
          return generateEvents();
        }}
      />
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
                onQuerySubmit={(next, isUpdate) => {
                  if (!isUpdate) {
                    significantEventsFetchState.refresh();
                    return;
                  }

                  if (next.dateRange) {
                    streamsAppRouter.push(routePath, {
                      path,
                      query: {
                        ...query,
                        kql: next.query,
                        rangeFrom: next.dateRange?.from,
                        rangeTo: next.dateRange?.to,
                      },
                    });

                    setTimeRange({
                      from: next.dateRange.from,
                      to: next.dateRange.to,
                      mode: next.dateRange.mode,
                    });
                  }
                }}
                onRefresh={() => {
                  significantEventsFetchState.refresh();
                }}
                dateRangeFrom={timeRange.from}
                dateRangeTo={timeRange.to}
                showQueryInput
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

        <EuiSpacer />

        <EuiFlexItem grow={false}>
          <SignificantEventsTable
            name={definition?.stream.name}
            response={significantEventsFetchState}
            onEditClick={(item) => {
              setIsEditFlyoutOpen(true);
              setQueryToEdit(item.query);
            }}
            onDeleteClick={async (item) => {
              if (!definition || !name) {
                return;
              }

              await streams.streamsRepositoryClient.fetch('PUT /api/streams/{name} 2023-10-31', {
                params: {
                  body: {
                    dashboards: definition.dashboards,
                    queries: definition.queries.filter(
                      (storedQuery) => storedQuery.id !== item.query.id
                    ),
                    stream: omit(definition.stream, 'name'),
                  },
                  path: {
                    name,
                  },
                },
              });
            }}
            xFormatter={xFormatter}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      {isEditFlyoutOpen ? (
        <SignificantEventFlyout
          onCreate={async (next) => {
            if (!definition || !name) {
              return;
            }

            await streams.streamsRepositoryClient.fetch('PUT /api/streams/{name} 2023-10-31', {
              params: {
                body: {
                  dashboards: definition.dashboards,
                  queries: definition.queries.concat(next),
                  stream: omit(definition.stream, 'name'),
                },
                path: {
                  name,
                },
              },
            });
          }}
          onUpdate={async () => {}}
          onClose={() => {
            setIsEditFlyoutOpen(false);
            setQueryToEdit(undefined);
          }}
          query={queryToEdit}
          name={definition?.stream.name ?? ''}
        />
      ) : null}
      {name && isSuggestionFlyoutOpen ? (
        <SignificantEventSuggestionsFlyout
          name={name}
          suggestions={suggestedEvents}
          onAccept={() => {}}
          onClose={() => {
            setIsSuggestionFlyoutOpen(false);
          }}
        />
      ) : (
        <></>
      )}
    </>
  );
}
