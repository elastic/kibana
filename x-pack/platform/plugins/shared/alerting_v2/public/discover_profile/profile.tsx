/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer } from '@elastic/eui';
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
  EpisodeRuleCell,
  EpisodeTagsCell,
  EpisodeDurationCell,
} from '@kbn/alerting-v2-episodes-ui/components/episodes_table_cell_renderers';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import { AlertEpisodeAssigneeCell } from '@kbn/alerting-v2-episodes-ui/components/assignee_cell';
import { buildAlertEventsTimeRangeFilter } from '@kbn/alerting-v2-episodes-ui/utils/build_alert_events_time_range_filter';
import type { DataTableRecord } from '@kbn/discover-utils';
import { AlertEpisodeOverviewListSection } from '@kbn/alerting-v2-episodes-ui/components/details/overview_list_section';
import { AlertEpisodesRelatedSection } from '@kbn/alerting-v2-episodes-ui/components/details/related_section';
import { AlertEpisodeMetadataSection } from '@kbn/alerting-v2-episodes-ui/components/details/metadata_section';
import { AlertEpisodeRunbookSection } from '@kbn/alerting-v2-episodes-ui/components/details/runbook_section';
import { createEpisodeActions } from '@kbn/alerting-v2-episodes-ui/actions/create_episode_actions';
import type { EpisodeAction } from '@kbn/alerting-v2-episodes-ui/actions/types';
import type { AlertEpisode } from '@kbn/alerting-v2-episodes-ui/queries/episodes_query';
import type { AlertEpisodeDetailsServices } from '@kbn/alerting-v2-episodes-ui/components/details/types';
import type { CoreStart as CoreStartContract } from '@kbn/core-lifecycle-browser';
import { CoreStart } from '@kbn/core-di-browser';
import { PluginStart } from '@kbn/core-di';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import type { UnifiedDocViewerStart } from '@kbn/unified-doc-viewer-plugin/public';
import { untilPluginStartServicesReady, type AlertingV2KibanaServices } from '../kibana_services';
import type { AlertingV2DiscoverProfileProvider } from '../types';

// DataSourceCategory.Default has value 'default'.
// We use the literal to avoid importing from the Discover plugin (circular dep).
const DATA_SOURCE_CATEGORY_DEFAULT = 'default';

type DiscoverProfileServices = AlertingV2KibanaServices &
  Pick<AlertEpisodeDetailsServices, 'spaces' | 'unifiedDocViewer' | 'userProfile'> &
  Pick<CoreStartContract, 'overlays' | 'rendering' | 'docLinks'> & {
    fieldFormats: FieldFormatsStart;
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

interface EpisodeActionControlProps {
  action: EpisodeAction;
  Control: RowControlComponent;
  rowProps: RowControlRowProps;
}

const EpisodeActionControl: React.FC<EpisodeActionControlProps> = ({
  action,
  Control,
  rowProps,
}) => {
  const episode = rowProps.record.flattened as unknown as AlertEpisode;
  return (
    <Control
      label={action.displayName}
      iconType={action.iconType}
      onClick={() => {
        action.execute({ episodes: [episode] });
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

// Discover's ES|QL data view has no field formats, so the page's duration format is applied here.
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
          { name: 'episode.status', width: 110 },
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

          'episode.status': (props: any) => <EpisodeStatusCell {...props} />,

          severity: (props: any) => <EpisodeSeverityCell {...props} />,

          'rule.id': (props: any) => (
            <EpisodeRuleCell {...props} rulesCache={{}} isLoadingRules={false} rowHeight={0} />
          ),

          duration: (props: any) => <DurationCellRenderer {...props} />,

          last_tags: (props: any) => <EpisodeTagsCell {...props} row={withTagsArray(props.row)} />,

          last_assignee_uid: (props: any) => (
            <AssigneeCellRenderer row={props.row} queryClient={queryClient} />
          ),
        };
      },

      getRowAdditionalLeadingControls: (prev) => (params) => {
        const prevControls = (prev as any)(params) || [];
        if (!resolvedEpisodeActions) return prevControls;

        const episodeColumns: RowControlColumn[] = resolvedEpisodeActions.map((action) => ({
          id: action.id,
          isAvailable: (rowProps: RowControlRowProps) => {
            const episode = rowProps.record.flattened as unknown as AlertEpisode;
            return action.isCompatible({ episodes: [episode] });
          },
          render: (Control: RowControlComponent, rowProps: RowControlRowProps) => (
            <EpisodeActionControl action={action} Control={Control} rowProps={rowProps} />
          ),
        }));

        return [...prevControls, ...episodeColumns];
      },

      getDocViewer: (prev: any) => (params: any) => {
        const episodeId = params.record.flattened['episode.id'] as string;
        const groupHash = params.record.flattened.group_hash as string | undefined;
        const prevValue = prev(params);

        const OverviewSection: React.FC = () => {
          const services = useAlertingV2Services();
          if (!services) return null;
          return (
            <>
              <EuiSpacer size="m" />
              <QueryClientProvider client={queryClient}>
                <AlertEpisodeOverviewListSection
                  episodeId={episodeId}
                  groupHash={groupHash}
                  services={services}
                />
              </QueryClientProvider>
            </>
          );
        };

        const RelatedSection: React.FC = () => {
          const services = useAlertingV2Services();
          if (!services) return null;
          return (
            <>
              <EuiSpacer size="m" />
              <QueryClientProvider client={queryClient}>
                <AlertEpisodesRelatedSection
                  episodeId={episodeId}
                  services={services}
                  getEpisodeDetailsHref={() => '#'}
                  showHeading={false}
                  compressed
                />
              </QueryClientProvider>
            </>
          );
        };

        const MetadataSection: React.FC = () => {
          const services = useAlertingV2Services();
          if (!services) return null;
          return (
            <>
              <EuiSpacer size="m" />
              <QueryClientProvider client={queryClient}>
                <AlertEpisodeMetadataSection episodeId={episodeId} services={services} />
              </QueryClientProvider>
            </>
          );
        };

        const RunbookSection: React.FC = () => {
          const services = useAlertingV2Services();
          if (!services) return null;
          return (
            <>
              <EuiSpacer size="m" />
              <QueryClientProvider client={queryClient}>
                <AlertEpisodeRunbookSection episodeId={episodeId} services={services} />
              </QueryClientProvider>
            </>
          );
        };

        return {
          title: prevValue.title,

          docViewsRegistry: (registry: any) => {
            registry.add({
              id: 'alerting_v2_overview',
              title: 'Overview',
              order: 0,
              render: OverviewSection,
            });

            registry.add({
              id: 'alerting_v2_related',
              title: 'Related',
              order: 10,
              render: RelatedSection,
            });

            registry.add({
              id: 'alerting_v2_metadata',
              title: 'Metadata',
              order: 20,
              render: MetadataSection,
            });

            registry.add({
              id: 'alerting_v2_runbook',
              title: 'Runbook',
              order: 30,
              render: RunbookSection,
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
