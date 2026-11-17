/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Meta, StoryObj } from '@storybook/react';
import React, { useMemo } from 'react';
import { ReactFlowProvider, type NodeProps } from '@xyflow/react';
import { createMemoryHistory } from 'history';
import * as t from 'io-ts';
import { createRouter, RouterProvider, type RouteMap } from '@kbn/typed-react-router-config';
import { useKibana } from '../../../../../hooks/use_kibana';
import {
  createFixtureStreamsRepositoryClient,
  createFixtureUnitStatsClient,
} from '../../../../../services/unit_stats_client/fixture_unit_stats_client';
import { StreamsAppContextProvider } from '../../../../streams_app_context_provider';
import type { StatsFixtureScenario } from '../../../../../services/unit_stats_client/fixture_unit_stats_client';
import { StatsManagerProvider } from '../../../../unit_stats/state_management/use_stats_manager';
import type { DestinationNodeData, DestinationNode as DestinationNodeType } from '../types';
import { DestinationNode } from './destination_node';

// The route of the unit, which the popover reads the unit from when it asks for the series of a
// destination. Nothing renders it, and the page of the unit is not loaded.
const storyRouter = createRouter<RouteMap>({
  '/v2/unit/{unitId}/{tab}': {
    element: <></>,
    params: t.type({ path: t.type({ unitId: t.string, tab: t.string }) }),
  },
});
const storyHistory = createMemoryHistory({ initialEntries: ['/v2/unit/default/map'] });

/**
 * The popover of a node asks for the series of its destination with a client that it builds from
 * the repository client of the page. This gives that client the answers of the fixture scenario.
 */
function FixtureRepositoryClient({
  scenario,
  children,
}: React.PropsWithChildren<{ scenario: StatsFixtureScenario }>) {
  const kibana = useKibana();
  const context = useMemo(
    () => ({
      ...kibana,
      dependencies: {
        start: {
          ...kibana.dependencies.start,
          streams: {
            ...kibana.dependencies.start.streams,
            streamsRepositoryClient: createFixtureStreamsRepositoryClient(scenario),
          },
        },
      },
    }),
    [kibana, scenario]
  );

  return <StreamsAppContextProvider context={context}>{children}</StreamsAppContextProvider>;
}

/**
 * A destination node as the Map draws it, with its stats from a fixture scenario. The stats arrive
 * through the real stats manager, so the footer goes through the same states as on the Map. Hover
 * the red badge to open the failure popover.
 */
function DestinationNodeStory({
  scenario,
  data,
}: {
  scenario: StatsFixtureScenario;
  data: DestinationNodeData;
}) {
  const client = useMemo(() => createFixtureUnitStatsClient({ scenario }), [scenario]);

  return (
    <RouterProvider history={storyHistory} router={storyRouter}>
      <FixtureRepositoryClient scenario={scenario}>
        <ReactFlowProvider>
          <StatsManagerProvider unitId="default" client={client}>
            <div style={{ inlineSize: 280, paddingBlockStart: 260 }}>
              <DestinationNode
                {...({ data, selected: false, dragging: false } as NodeProps<DestinationNodeType>)}
              />
            </div>
          </StatsManagerProvider>
        </ReactFlowProvider>
      </FixtureRepositoryClient>
    </RouterProvider>
  );
}

const meta: Meta<typeof DestinationNodeStory> = {
  component: DestinationNodeStory,
  title: 'streams/canvas/DestinationNode',
};

export default meta;
type Story = StoryObj<typeof DestinationNodeStory>;

const ELASTICSEARCH: DestinationNodeData = {
  title: 'logs-stuff',
  subtitle: 'Auto',
  destinationId: 'es-prod',
  destinationType: 'elasticsearch',
  hasSavedSource: true,
  signals: ['logs'],
  indexCount: 3,
};

/** Delivering, with no failures: the rate and the latency, and no warning. */
export const Healthy: Story = {
  args: { scenario: 'data', data: ELASTICSEARCH },
};

/** Every item refused with a 401: the class has a stat and no causes. */
export const ElasticsearchAuthenticationFailures: Story = {
  args: {
    scenario: 'authFailures',
    data: { ...ELASTICSEARCH, title: 'es-dev', destinationId: 'es-dev' },
  },
};

/** An S3 destination counts upload attempts, while its incoming rate stays in events. */
export const S3UploadAttemptFailures: Story = {
  args: {
    scenario: 's3Failures',
    data: {
      title: 'Archive',
      subtitle: 'my-bucket',
      destinationId: 's3-test',
      destinationType: 's3',
      hasSavedSource: true,
      signals: ['logs'],
    },
  },
};

/** The failure query failed: real numbers, a partial icon, and no failure rates. */
export const PartialStats: Story = {
  args: {
    scenario: 'partialFailure',
    data: { ...ELASTICSEARCH, title: 'es-dev', destinationId: 'es-dev' },
  },
};

/** Nothing has arrived in the window. */
export const DataNotFlowingIn: Story = {
  args: { scenario: 'noData', data: ELASTICSEARCH },
};

/** The stats could not be loaded: a warning and no numbers. */
export const StatsCouldNotBeLoaded: Story = {
  args: { scenario: 'kindError', data: ELASTICSEARCH },
};

/** No source feeds the destination in the saved unit, so nothing is requested. */
export const NoSavedSource: Story = {
  args: { scenario: 'data', data: { ...ELASTICSEARCH, hasSavedSource: false } },
};
