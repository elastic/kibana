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
  TAG_FILTER_LABEL,
  ASSIGNEE_FILTER_LABEL,
  STATUS_FILTER_LABEL,
  RULE_FILTER_LABEL,
} from '@kbn/alerting-v2-episodes-ui/components/filters/translations';
import {
  EpisodeStatusCell,
  EpisodeTagsCell,
  EpisodeRuleCell,
} from '@kbn/alerting-v2-episodes-ui/components/episodes_table_cell_renderers';
import { AlertEpisodeAssigneeCell } from '@kbn/alerting-v2-episodes-ui/components/assignee_cell';
import { AlertEpisodeOverviewSection } from '@kbn/alerting-v2-episodes-ui/components/details/overview_section';
import { AlertEpisodesRelatedSection } from '@kbn/alerting-v2-episodes-ui/components/details/related_section';
import { AlertEpisodeMetadataSection } from '@kbn/alerting-v2-episodes-ui/components/details/metadata_section';
import { AlertEpisodeRunbookSection } from '@kbn/alerting-v2-episodes-ui/components/details/runbook_section';
import { createEpisodeActions } from '@kbn/alerting-v2-episodes-ui/actions/create_episode_actions';
import type { EpisodeAction } from '@kbn/alerting-v2-episodes-ui/actions/types';
import type { AlertEpisode } from '@kbn/alerting-v2-episodes-ui/queries/episodes_query';
import { untilPluginStartServicesReady, type AlertingV2KibanaServices } from '../kibana_services';
import type { AlertingV2DiscoverProfileProvider } from '../types';

// DataSourceCategory.Default has value 'default'.
// We use the literal to avoid importing from the Discover plugin (circular dep).
const DATA_SOURCE_CATEGORY_DEFAULT = 'default';

const useAlertingV2Services = () => {
  const [services, setServices] = React.useState<AlertingV2KibanaServices | undefined>(undefined);
  React.useEffect(() => {
    untilPluginStartServicesReady().then(setServices);
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
  row: any;
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

export const createDiscoverProfile = (): AlertingV2DiscoverProfileProvider => {
  const queryClient = new QueryClient();
  let resolvedEpisodeActions: EpisodeAction[] | undefined;

  untilPluginStartServicesReady().then((services) => {
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
      getDiscoverHref: () => undefined,
    });
  });

  return {
    profileId: 'alerting-v2-data-source-profile',
    profile: {
      getDefaultAppState: () => () => ({
        columns: [
          { name: '@timestamp', width: 200 },
          { name: 'effective_status', width: 120 },
          { name: 'rule.id', width: 250 },
          { name: 'last_tags', width: 200 },
          { name: 'last_assignee_uid', width: 180 },
        ],
      }),

      getColumnsConfiguration: (prev: any) => () => ({
        ...(prev ? prev() : {}),
        // `display` (a React element) takes precedence over `displayAsText` in EUI, so we
        // clear it so the grid falls back to rendering `displayAsText` as plain text.

        effective_status: ({ column }: any) => ({
          ...column,
          display: undefined,
          displayAsText: STATUS_FILTER_LABEL,
        }),

        'rule.id': ({ column }: any) => ({
          ...column,
          display: undefined,
          displayAsText: RULE_FILTER_LABEL,
        }),

        last_tags: ({ column }: any) => ({
          ...column,
          display: undefined,
          displayAsText: TAG_FILTER_LABEL,
        }),

        last_assignee_uid: ({ column }: any) => ({
          ...column,
          display: undefined,
          displayAsText: ASSIGNEE_FILTER_LABEL,
        }),
      }),

      getCellRenderers: (prev) => (params) => {
        return {
          ...prev(params),

          effective_status: (props: any) => <EpisodeStatusCell {...props} />,

          last_tags: (props: any) => <EpisodeTagsCell {...props} />,

          'rule.id': (props: any) => (
            <EpisodeRuleCell {...props} rulesCache={{}} isLoadingRules={false} rowHeight={0} />
          ),

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
                <AlertEpisodeOverviewSection
                  episodeId={episodeId}
                  groupHash={groupHash}
                  services={services}
                  getRuleDetailsHref={() => '#'}
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
