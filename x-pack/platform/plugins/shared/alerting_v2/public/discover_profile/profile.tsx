/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSkeletonText, EuiSpacer } from '@elastic/eui';
import { ROWS_HEIGHT_OPTIONS } from '@kbn/unified-data-table';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import type {
  RowControlColumn,
  RowControlComponent,
  RowControlRowProps,
} from '@kbn/discover-utils';
import {
  STATUS_FIELD_LABEL,
  SEVERITY_FIELD_LABEL,
  RULE_FIELD_LABEL,
  DURATION_FIELD_LABEL,
} from '@kbn/alerting-v2-episodes-ui/hooks/translations';
import { DURATION_FIELD_FORMAT } from '@kbn/alerting-v2-episodes-ui/hooks/use_alerting_episodes_data_view';
import {
  EPISODES_LIST_COLUMN_ALERT_TAGS,
  EPISODES_LIST_COLUMN_ASSIGNEES,
} from '@kbn/alerting-v2-episodes-ui/components/translations';
import {
  EpisodeStatusCell,
  EpisodeSeverityCell,
  EpisodeTagsCell,
  EpisodeDurationCell,
} from '@kbn/alerting-v2-episodes-ui/components/episodes_table_cell_renderers';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import { AlertEpisodeAssigneeCell } from '@kbn/alerting-v2-episodes-ui/components/assignee_cell';
import { buildAlertEventsTimeRangeFilter } from '@kbn/alerting-v2-episodes-ui/utils/build_alert_events_time_range_filter';
import type { DataTableRecord } from '@kbn/discover-utils';
import { createEpisodeActions } from '@kbn/alerting-v2-episodes-ui/actions/create_episode_actions';
import type { EpisodeAction } from '@kbn/alerting-v2-episodes-ui/actions/types';
import type { AlertEpisode } from '@kbn/alerting-v2-episodes-ui/queries/episodes_query';
import type { AlertEpisodeDetailsServices } from '@kbn/alerting-v2-episodes-ui/components/details/types';
import type { CoreStart as CoreStartContract } from '@kbn/core-lifecycle-browser';
import { CoreStart } from '@kbn/core-di-browser';
import { PluginStart } from '@kbn/core-di';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import type { UnifiedDocViewerStart } from '@kbn/unified-doc-viewer-plugin/public';
import type { DocViewsRegistry } from '@kbn/unified-doc-viewer';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { ChartsPluginStart } from '@kbn/charts-plugin/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { AlertEpisodeTimelineSection } from '@kbn/alerting-v2-episodes-ui/components/details/timeline_section';
import {
  FLYOUT_ARIA_LABEL,
  FLYOUT_TAB_OVERVIEW,
  FLYOUT_TAB_TIMELINE,
} from '@kbn/alerting-v2-episodes-ui/components/details/translations';
import { OBSERVABILITY_ALERTING_HOST } from '../../common/locators';
import { bindLocatorsToHost, getAlertingV2Locators } from '../application/bind_locators_to_host';
import type { AlertingV2Locators } from '../application/locator_context';
import { EpisodeOverviewDocView } from './episode_overview_doc_view';
import { UserCapabilities } from '../services/user_capabilities';
import { EpisodeStatusCellWithRangeHint } from './status_cell_with_range_hint';
import {
  EpisodeRuleCellWithFetch,
  type EpisodeRuleCellWithFetchProps,
} from './rule_cell_with_fetch';
import { EpisodeDocViewerHeader } from './episode_doc_viewer_header';
import { EpisodeDocViewerFooter } from './episode_doc_viewer_footer';
import { EpisodeTableDocView, type EpisodeTableDocViewProps } from './episode_table_doc_view';
import { untilPluginStartServicesReady, type AlertingV2KibanaServices } from '../kibana_services';
import type { AlertingV2DiscoverProfileProvider } from '../types';

// Discover's Table tab. The doc viewer plugin registers it with this literal id.
const DOC_VIEW_TABLE_ID = 'doc_view_table';

// DataSourceCategory.Default has value 'default'.
// We use the literal to avoid importing from the Discover plugin (circular dep).
const DATA_SOURCE_CATEGORY_DEFAULT = 'default';

type DiscoverProfileServices = AlertingV2KibanaServices &
  Pick<AlertEpisodeDetailsServices, 'spaces' | 'unifiedDocViewer' | 'userProfile'> &
  Pick<CoreStartContract, 'overlays' | 'rendering' | 'docLinks'> & {
    fieldFormats: FieldFormatsStart;
    charts: ChartsPluginStart;
    locators: AlertingV2Locators;
  };

let profileServicesPromise: Promise<DiscoverProfileServices> | undefined;

// The shared services don't carry everything the episodes UI needs, so the rest comes from the DI container.
const getProfileServices = (): Promise<DiscoverProfileServices> => {
  profileServicesPromise ??= untilPluginStartServicesReady().then((services) => {
    const { container } = services;
    return {
      ...services,
      userProfile: container.get(CoreStart('userProfile')),
      overlays: container.get(CoreStart('overlays')),
      rendering: container.get(CoreStart('rendering')),
      docLinks: container.get(CoreStart('docLinks')),
      spaces: container.get(PluginStart('spaces')) as SpacesPluginStart,
      unifiedDocViewer: container.get(PluginStart('unifiedDocViewer')) as UnifiedDocViewerStart,
      fieldFormats: container.get(PluginStart('fieldFormats')) as FieldFormatsStart,
      charts: container.get(PluginStart('charts')) as ChartsPluginStart,
      // Links go to the alerting pages in Observability, like the agent builder attachments.
      locators: bindLocatorsToHost(
        getAlertingV2Locators(container.get(PluginStart('share')) as SharePluginStart),
        OBSERVABILITY_ALERTING_HOST
      ),
    };
  });
  return profileServicesPromise;
};

const useAlertingV2Services = () => {
  const [services, setServices] = React.useState<DiscoverProfileServices | undefined>(undefined);
  React.useEffect(() => {
    getProfileServices().then(setServices);
  }, []);
  return services;
};

interface EpisodeServicesProviderProps {
  queryClient: QueryClient;
  children: (services: DiscoverProfileServices) => React.ReactNode;
}

// Some episodes UI components read their services from the Kibana context, which holds
// Discover's services here, so ours replace them for our own components.
const EpisodeServicesProvider = ({ queryClient, children }: EpisodeServicesProviderProps) => {
  const services = useAlertingV2Services();
  if (!services) return null;
  return (
    <KibanaContextProvider services={services}>
      <QueryClientProvider client={queryClient}>{children(services)}</QueryClientProvider>
    </KibanaContextProvider>
  );
};

interface EpisodeActionControlProps {
  action: EpisodeAction;
  Control: RowControlComponent;
  rowProps: RowControlRowProps;
  onSuccess: () => void;
}

const EpisodeActionControl: React.FC<EpisodeActionControlProps> = ({
  action,
  Control,
  rowProps,
  onSuccess,
}) => {
  const episode = rowProps.record.flattened as unknown as AlertEpisode;
  return (
    <Control
      label={action.displayName}
      iconType={action.iconType}
      onClick={() => {
        action.execute({ episodes: [episode], onSuccess });
      }}
    />
  );
};

interface AssigneeCellRendererProps {
  row: DataTableRecord;
  queryClient: QueryClient;
}

const AssigneeCellRenderer: React.FC<AssigneeCellRendererProps> = ({ row, queryClient }) => {
  const services = useAlertingV2Services();
  if (!services) return null;
  return (
    <QueryClientProvider client={queryClient}>
      <AlertEpisodeAssigneeCell
        assigneeUid={row.flattened.last_assignee_uid as string | undefined}
        userProfile={services.userProfile}
      />
    </QueryClientProvider>
  );
};

type RuleCellRendererProps = Omit<EpisodeRuleCellWithFetchProps, 'http' | 'getRuleDetailsHref'>;

// Discover has no table-level rules cache like the alerts page, so each cell fetches its rule.
const RuleCellRenderer: React.FC<RuleCellRendererProps> = (props) => {
  const services = useAlertingV2Services();
  if (!services) return <EuiSkeletonText lines={1} />;
  return (
    <EpisodeRuleCellWithFetch
      {...props}
      http={services.http}
      // The rule details page isn't linked from Discover yet.
      getRuleDetailsHref={() => undefined}
    />
  );
};

// Discover's ES|QL data view has no field formats, so the page's duration format is applied here.
// Discover loads the table with the global time range, so the cell reads its end from there.
const StatusCellRenderer: React.FC<React.ComponentProps<typeof EpisodeStatusCell>> = (props) => {
  const services = useAlertingV2Services();
  if (!services) return <EpisodeStatusCell {...props} />;
  const { to } = services.data.query.timefilter.timefilter.getAbsoluteTime();
  return (
    <EpisodeStatusCellWithRangeHint
      {...props}
      rangeEnd={to}
      dateFormat={services.uiSettings.get('dateFormat')}
    />
  );
};

const DurationCellRenderer: React.FC<React.ComponentProps<typeof EpisodeDurationCell>> = (
  props
) => {
  const services = useAlertingV2Services();
  const formatDuration = React.useMemo(() => {
    if (!services) return undefined;
    const formatter = services.fieldFormats.getInstance(
      DURATION_FIELD_FORMAT.id,
      DURATION_FIELD_FORMAT.params
    );
    return (durationMs: number) => formatter.convertToText(durationMs);
  }, [services]);
  return <EpisodeDurationCell {...props} formatDuration={formatDuration} />;
};

const TableSection: React.FC<Omit<EpisodeTableDocViewProps, 'services'>> = (props) => {
  const services = useAlertingV2Services();
  if (!services) return null;
  return <EpisodeTableDocView {...props} services={services} />;
};

// ES|QL returns a single value of a multi-value field as a plain string.
const withTagsArray = (row: DataTableRecord): DataTableRecord => {
  const { last_tags: tags } = row.flattened;
  if (tags == null || Array.isArray(tags)) return row;
  return { ...row, flattened: { ...row.flattened, last_tags: [tags] } };
};

export const createDiscoverProfile = (): AlertingV2DiscoverProfileProvider => {
  const queryClient = new QueryClient();
  let resolvedEpisodeActions: EpisodeAction[] | undefined;

  getProfileServices().then((services) => {
    resolvedEpisodeActions = createEpisodeActions({
      http: services.http,
      overlays: services.overlays,
      notifications: services.notifications,
      rendering: services.rendering,
      application: services.application,
      userProfile: services.userProfile,
      docLinks: services.docLinks,
      expressions: services.expressions,
      spaces: services.spaces,
      queryClient,
      // The view only returns native episodes, so the universal alerts privilege covers them all.
      canWriteNativeEpisodes: services.container.get(UserCapabilities).canWrite('alerts'),
      // Rules are not loaded in Discover, so rule-dependent actions stay hidden.
      isRuleAvailable: () => false,
      getDiscoverHref: () => undefined,
    });
  });

  return {
    profileId: 'alerting-v2-data-source-profile',
    profile: {
      getDefaultAppState: () => () => ({
        columns: [
          // Fits the longest status plus the snooze and ack badges.
          { name: 'episode.status', width: 180 },
          { name: 'severity', width: 100 },
          { name: '@timestamp', width: 200 },
          { name: 'rule.id', width: 250 },
          { name: 'duration', width: 110 },
          { name: 'last_tags' },
          { name: 'last_assignee_uid', width: 120 },
        ],
      }),

      // The view aggregates action documents of any age, so the default range filter on
      // `@timestamp` would drop them. The page's filter bounds the alert events only.
      getEsqlSearchContext: (prev) => (params) => {
        const { filters = [] } = prev(params);
        const timeRangeFilter = buildAlertEventsTimeRangeFilter(params.timeRange);
        return {
          timeField: undefined,
          filters: timeRangeFilter ? [...filters, timeRangeFilter] : filters,
        };
      },

      getColumnsConfiguration: (prev: any) => () => ({
        ...(prev ? prev() : {}),
        // `display` (a React element) takes precedence over `displayAsText` in EUI, so we
        // clear it so the grid falls back to rendering `displayAsText` as plain text.

        'episode.status': ({ column }: any) => ({
          ...column,
          display: undefined,
          displayAsText: STATUS_FIELD_LABEL,
        }),

        severity: ({ column }: any) => ({
          ...column,
          display: undefined,
          displayAsText: SEVERITY_FIELD_LABEL,
        }),

        'rule.id': ({ column }: any) => ({
          ...column,
          display: undefined,
          displayAsText: RULE_FIELD_LABEL,
        }),

        duration: ({ column }: any) => ({
          ...column,
          display: undefined,
          displayAsText: DURATION_FIELD_LABEL,
        }),

        last_tags: ({ column }: any) => ({
          ...column,
          display: undefined,
          displayAsText: EPISODES_LIST_COLUMN_ALERT_TAGS,
        }),

        last_assignee_uid: ({ column }: any) => ({
          ...column,
          display: undefined,
          displayAsText: EPISODES_LIST_COLUMN_ASSIGNEES,
        }),
      }),

      getCellRenderers: (prev) => (params) => {
        return {
          ...prev(params),

          'episode.status': (props: any) => <StatusCellRenderer {...props} />,

          severity: (props: any) => <EpisodeSeverityCell {...props} />,

          'rule.id': (props: any) => (
            <QueryClientProvider client={queryClient}>
              <RuleCellRenderer
                {...props}
                rowHeight={params.rowHeight ?? ROWS_HEIGHT_OPTIONS.default}
              />
            </QueryClientProvider>
          ),

          duration: (props: any) => <DurationCellRenderer {...props} />,

          last_tags: (props: any) => <EpisodeTagsCell {...props} row={withTagsArray(props.row)} />,

          last_assignee_uid: (props: any) => (
            <AssigneeCellRenderer row={props.row} queryClient={queryClient} />
          ),
        };
      },

      getRowAdditionalLeadingControls:
        (prev, { toolkit }) =>
        (params) => {
          const prevControls = (prev as any)(params) || [];
          if (!resolvedEpisodeActions) return prevControls;

          // Reloads the table and refetches what the open flyout shows, like the alerts page.
          const onActionSuccess = () => {
            toolkit.actions.refreshData?.();
            queryClient.invalidateQueries();
          };

          const episodeColumns: RowControlColumn[] = resolvedEpisodeActions.map((action) => ({
            id: action.id,
            isAvailable: (rowProps: RowControlRowProps) => {
              const episode = rowProps.record.flattened as unknown as AlertEpisode;
              return action.isCompatible({ episodes: [episode] });
            },
            render: (Control: RowControlComponent, rowProps: RowControlRowProps) => (
              <EpisodeActionControl
                action={action}
                Control={Control}
                rowProps={rowProps}
                onSuccess={onActionSuccess}
              />
            ),
          }));

          return [...prevControls, ...episodeColumns];
        },

      getDocViewer:
        (prev: any, { toolkit }) =>
        (params: any) => {
          const episodeId = params.record.flattened['episode.id'] as string;
          const groupHash = params.record.flattened.group_hash as string | undefined;

          const onActionSuccess = () => {
            toolkit.actions.refreshData?.();
            queryClient.invalidateQueries();
          };

          // Discover renders it at the top of the flyout body, so it scrolls with the tabs.
          const HeaderSection: React.FC = () => (
            <EpisodeServicesProvider queryClient={queryClient}>
              {(services) => (
                <EpisodeDocViewerHeader
                  episodeId={episodeId}
                  groupHash={groupHash}
                  services={services}
                  actions={resolvedEpisodeActions}
                  onActionSuccess={onActionSuccess}
                />
              )}
            </EpisodeServicesProvider>
          );

          const { setExpandedDoc } = toolkit.actions;
          const FooterSection: React.FC = () => (
            <EpisodeServicesProvider queryClient={queryClient}>
              {(services) => (
                <EpisodeDocViewerFooter
                  episodeId={episodeId}
                  groupHash={groupHash}
                  services={services}
                  actions={resolvedEpisodeActions}
                  viewDetailsHref={services.locators.episodesLocators.getRedirectUrl({ episodeId })}
                  onActionSuccess={onActionSuccess}
                  onClose={setExpandedDoc ? () => setExpandedDoc(undefined) : undefined}
                />
              )}
            </EpisodeServicesProvider>
          );

          const OverviewSection: React.FC = () => (
            <EpisodeServicesProvider queryClient={queryClient}>
              {(services) => {
                const { rulesLocators, episodesLocators } = services.locators;
                return (
                  <EpisodeOverviewDocView
                    episodeId={episodeId}
                    groupHash={groupHash}
                    services={services}
                    getRuleDetailsHref={(ruleId) => rulesLocators.getRedirectUrl({ ruleId })}
                    getEpisodeDetailsHref={(id) =>
                      episodesLocators.getRedirectUrl({ episodeId: id })
                    }
                  />
                );
              }}
            </EpisodeServicesProvider>
          );

          const TimelineSection: React.FC = () => (
            <EpisodeServicesProvider queryClient={queryClient}>
              {(services) => (
                <>
                  <EuiSpacer size="m" />
                  <AlertEpisodeTimelineSection
                    episodeId={episodeId}
                    seriesId={(params.record.flattened.series_id as string | undefined) ?? null}
                    groupHash={groupHash}
                    services={services}
                  />
                </>
              )}
            </EpisodeServicesProvider>
          );

          return {
            // Like the alerts page flyout menu. The rule name is the header title.
            title: FLYOUT_ARIA_LABEL,
            renderHeader: () => <HeaderSection />,
            renderFooter: () => <FooterSection />,

            docViewsRegistry: (registry: DocViewsRegistry) => {
              // The row holds the last event data as one JSON string, so Discover's table
              // shows it with one row per value instead.
              const tableDocView = registry.getAll().find(({ id }) => id === DOC_VIEW_TABLE_ID);
              if (tableDocView) {
                registry.removeById(DOC_VIEW_TABLE_ID);
                registry.add({
                  ...tableDocView,
                  render: (props) => (
                    <QueryClientProvider client={queryClient}>
                      <TableSection renderTable={tableDocView.render} renderProps={props} />
                    </QueryClientProvider>
                  ),
                });
              }

              // Discover's tabs start at order 10, so ours come first.
              registry.add({
                id: 'alerting_v2_overview',
                title: FLYOUT_TAB_OVERVIEW,
                order: 0,
                render: () => <OverviewSection />,
              });

              registry.add({
                id: 'alerting_v2_timeline',
                title: FLYOUT_TAB_TIMELINE,
                order: 1,
                render: () => <TimelineSection />,
              });

              return registry;
            },
          };
        },
    },

    resolve: async ({ query }) => {
      if (!query || !('esql' in query)) return { isMatch: false };
      if (!/FROM\s+\$\.alert-episodes/i.test((query as { esql: string }).esql))
        return { isMatch: false };
      return { isMatch: true, context: { category: DATA_SOURCE_CATEGORY_DEFAULT } };
    },
  };
};
