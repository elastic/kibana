/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import type { InvestigationImpactMapResponse } from '../../../../../common';
import { useInvestigation } from '../../../../investigations/hooks/use_investigation';
import type { ImpactMapRendererProps } from '../../../../types';
import { ImpactMapTab } from './impact_map_tab';
import {
  getEntityIcon,
  getEntityKind,
  getEntityKindLabel,
  getEntityTypeLabel,
  withContextAnnotations,
} from './impact_map_events';
import { takeTimelineEventFocus, takeTimelineFocus } from './timeline_focus';
import { useIsInAgentBuilder } from './use_is_in_agent_builder';

jest.mock('@kbn/agent-builder-plugin/public', () => ({
  useConversationFlyoutWidthProps: () => ({
    size: 480,
    minWidth: 400,
    maxWidth: 640,
    resizable: true,
    onResize: jest.fn(),
  }),
}));
jest.mock('./use_is_in_agent_builder');
const mockUseIsInAgentBuilder = useIsInAgentBuilder as jest.Mock;
const mockEuiFlyout = jest.fn();
jest.mock('@elastic/eui', () => {
  const actual = jest.requireActual('@elastic/eui');
  const { createElement } = jest.requireActual('react');
  return {
    ...actual,
    EuiFlyout: (props: object) => {
      mockEuiFlyout(props);
      return createElement(actual.EuiFlyout, props);
    },
  };
});
jest.mock('../../../../investigations/hooks/use_investigation');
const mockUseInvestigation = useInvestigation as jest.Mock;

const FakeRenderer: React.FC<ImpactMapRendererProps> = ({
  impactMap,
  onEntityClick,
  onRelationshipClick,
  onToggleFullScreen,
}) => (
  <div data-test-subj="fakeImpactMapRenderer">
    {impactMap.entities.map(({ id }) => id).join(',')}
    <button data-test-subj="agenticInvestigationsImpactMapMaximize" onClick={onToggleFullScreen} />
    <button data-test-subj="fakeEntity" onClick={() => onEntityClick?.('payment')} />
    <button
      data-test-subj="fakeRelationship"
      onClick={() => onRelationshipClick?.('checkout->payment:calls')}
    />
  </div>
);

const impactMap: InvestigationImpactMapResponse = {
  title: 'Checkout failures',
  entities: [
    { id: 'checkout', type_id: 'service', label: 'checkout' },
    { id: 'payment', type_id: 'service', label: 'payment' },
  ],
  relationships: [
    {
      id: 'checkout->payment:calls',
      type_id: 'calls',
      source_id: 'checkout',
      target_id: 'payment',
    },
  ],
  entity_types: [{ id: 'service', label: 'Service', kind: 'service' }],
  relationship_types: [{ id: 'calls', label: 'calls' }],
  events: [
    {
      id: 'e1',
      kind: 'change',
      title: 'Deployed payment v2',
      at: '2026-11-07T10:00:00.000Z',
      entity_id: 'payment',
    },
    {
      id: 'e2',
      kind: 'failure',
      title: 'Payment errors rose to 40%',
      description: 'Errors started a minute after the deploy.',
      at: '2026-11-07T10:01:00.000Z',
      entity_id: 'payment',
    },
    {
      id: 'e3',
      kind: 'failure',
      title: 'Calls timed out',
      at: '2026-11-07T10:02:00.000Z',
      relationship_id: 'checkout->payment:calls',
    },
  ],
  created_at: '2026-11-07T00:00:00.000Z',
};

const renderTab = (openTimeline?: () => void) =>
  render(
    <EuiProvider>
      <I18nProvider>
        <ImpactMapTab conversationId="conv-1" Renderer={FakeRenderer} openTimeline={openTimeline} />
      </I18nProvider>
    </EuiProvider>
  );

const withMetadata: InvestigationImpactMapResponse = {
  ...impactMap,
  entities: [
    { id: 'checkout', type_id: 'service', label: 'checkout' },
    {
      id: 'payment',
      type_id: 'service',
      label: 'payment',
      metadata: [
        { key: 'k8s.namespace.name', value: 'payments' },
        { key: 'cloud.availability_zone', value: 'eu-west-1b' },
        { key: 'service.version', value: '2.1.0' },
        { key: 'team.pager', value: 'payments-oncall', label: 'Pager', featured: true },
      ],
    },
  ],
};

describe('getEntityTypeLabel', () => {
  it('shows the kind and the type under it', () => {
    expect(
      getEntityTypeLabel({
        id: 'k8s.deployment',
        label: 'Kubernetes deployment',
        kind: 'infrastructure',
      })
    ).toBe('Infrastructure › Kubernetes deployment');
    expect(getEntityTypeLabel({ id: 'service', label: 'Service', kind: 'service' })).toBe(
      'Service'
    );
  });
});

describe('getEntityKind', () => {
  it('treats an old service type with a Kubernetes icon and no agent as infrastructure', () => {
    expect(
      getEntityKind({
        id: 'k8s_deployment',
        label: 'K8s deployment',
        kind: 'service',
        icon: { eui_icon: 'logoKubernetes' },
      })
    ).toBe('infrastructure');
    expect(
      getEntityKind({ id: 'java', label: 'Java', kind: 'service', icon: { agent_name: 'java' } })
    ).toBe('service');
  });
});

describe('ImpactMapTab', () => {
  it('says what an entity is under its title, from the entity or else its type', async () => {
    mockUseIsInAgentBuilder.mockReturnValue(false);
    mockUseInvestigation.mockReturnValue({
      data: {
        in_progress: false,
        impact_map: {
          ...impactMap,
          entities: [
            { id: 'checkout', type_id: 'service', label: 'checkout' },
            {
              id: 'payment',
              type_id: 'service',
              label: 'payment',
              description: 'Takes card payments for checkout.',
            },
          ],
          entity_types: [
            { id: 'service', label: 'Service', kind: 'service', description: 'Application code.' },
          ],
        },
      },
    });

    renderTab();
    fireEvent.click(screen.getByTestId('fakeEntity'));

    expect(
      await screen.findByTestId('agenticInvestigationsImpactMapEntityDescription')
    ).toHaveTextContent('Takes card payments for checkout.');
  });

  it('shows key metadata first and the rest in a filterable Metadata tab', async () => {
    mockUseIsInAgentBuilder.mockReturnValue(false);
    mockUseInvestigation.mockReturnValue({
      data: { in_progress: false, impact_map: withMetadata },
    });

    renderTab();
    fireEvent.click(screen.getByTestId('fakeEntity'));

    // Standard fields marked as featured, and an entry that features itself, lead the flyout.
    const featured = await screen.findByTestId('agenticInvestigationsImpactMapFeaturedMetadata');
    expect(featured).toHaveTextContent('Namespace');
    expect(featured).toHaveTextContent('payments');
    expect(featured).toHaveTextContent('Pager');
    expect(featured).not.toHaveTextContent('2.1.0');

    fireEvent.click(screen.getByTestId('agenticInvestigationsImpactMapMetadataTab'));
    const table = await screen.findByTestId('agenticInvestigationsImpactMapMetadataTable');
    expect(table).toHaveTextContent('2.1.0');
    expect(table).toHaveTextContent('Availability zone');

    fireEvent.change(screen.getByPlaceholderText('Filter fields and values'), {
      target: { value: 'eu-west' },
    });
    expect(await within(table).findByText('eu-west-1b')).toBeInTheDocument();
    expect(within(table).queryByText('2.1.0')).toBeNull();
  });

  it('shows a Metadata tab for an entity with none yet, and says why', async () => {
    mockUseIsInAgentBuilder.mockReturnValue(false);
    mockUseInvestigation.mockReturnValue({ data: { in_progress: false, impact_map: impactMap } });

    renderTab();
    fireEvent.click(screen.getByTestId('fakeEntity'));
    fireEvent.click(await screen.findByTestId('agenticInvestigationsImpactMapMetadataTab'));

    expect(await screen.findByTestId('agenticInvestigationsImpactMapNoMetadata')).toHaveTextContent(
      'No metadata yet'
    );
  });

  it('opens an entity that has metadata but no events, on its Metadata tab', async () => {
    mockUseIsInAgentBuilder.mockReturnValue(false);
    mockUseInvestigation.mockReturnValue({
      data: {
        in_progress: false,
        impact_map: { ...withMetadata, events: [] },
      },
    });

    renderTab();
    fireEvent.click(screen.getByTestId('fakeEntity'));

    expect(await screen.findByTestId('agenticInvestigationsImpactMapMetadataTable')).toBeVisible();
  });

  it('draws the map with the registered renderer, under its title and updated time', () => {
    mockUseInvestigation.mockReturnValue({ data: { in_progress: false, impact_map: impactMap } });

    renderTab();

    expect(screen.getByText('Checkout failures')).toBeInTheDocument();
    expect(screen.getByTestId('agenticInvestigationsImpactMapUpdated')).toHaveTextContent(
      'Updated'
    );
    expect(screen.getByTestId('fakeImpactMapRenderer')).toHaveTextContent('checkout,payment');
  });

  it('opens the map full screen and exits again', () => {
    mockUseInvestigation.mockReturnValue({ data: { in_progress: false, impact_map: impactMap } });

    renderTab();
    fireEvent.click(screen.getByTestId('agenticInvestigationsImpactMapMaximize'));

    expect(screen.getByTestId('agenticInvestigationsImpactMapFullScreen')).toBeInTheDocument();
    expect(screen.getAllByTestId('fakeImpactMapRenderer')).toHaveLength(2);

    fireEvent.click(screen.getByTestId('agenticInvestigationsImpactMapExitFullScreen'));
    expect(
      screen.queryByTestId('agenticInvestigationsImpactMapFullScreen')
    ).not.toBeInTheDocument();
  });

  it("shows an entity's icon and type over its events, newest first, in the timeline style", () => {
    mockUseInvestigation.mockReturnValue({ data: { in_progress: false, impact_map: impactMap } });

    renderTab();
    fireEvent.click(screen.getByTestId('fakeEntity'));

    expect(screen.getByTestId('agenticInvestigationsImpactMapEventsType')).toHaveTextContent(
      'Service'
    );
    expect(screen.getByRole('tab', { name: /Events/ })).toHaveAttribute('aria-selected', 'true');
    const rows = screen.getAllByTestId('agenticInvestigationsTimelineRow');
    expect(rows.map((row) => row.textContent)).toEqual([
      expect.stringContaining('Payment errors rose to 40%'),
      expect.stringContaining('Deployed payment v2'),
    ]);
    // The list has no timeline link: it belongs to an open event.
    expect(screen.queryByTestId('agenticInvestigationsImpactMapViewInTimeline')).toBeNull();
  });

  it("filters an entity's events by event type", () => {
    mockUseInvestigation.mockReturnValue({ data: { in_progress: false, impact_map: impactMap } });

    renderTab();
    fireEvent.click(screen.getByTestId('fakeEntity'));
    expect(screen.getAllByTestId('agenticInvestigationsTimelineRow')).toHaveLength(2);

    fireEvent.click(screen.getByTestId('agenticInvestigationsImpactMapEventsTypeFilter'));
    fireEvent.click(
      within(
        screen.getByTestId('agenticInvestigationsImpactMapEventsTypeFilterOptions')
      ).getAllByRole('option')[0]
    );

    expect(screen.getAllByTestId('agenticInvestigationsTimelineRow')).toHaveLength(1);
  });

  it('opens an event in place of the list and goes back to it', () => {
    mockUseInvestigation.mockReturnValue({ data: { in_progress: false, impact_map: impactMap } });

    renderTab();
    fireEvent.click(screen.getByTestId('fakeEntity'));
    fireEvent.click(screen.getAllByTestId('agenticInvestigationsTimelineOpenEvent')[0]);

    expect(screen.getByTestId('agenticInvestigationsImpactMapEventDetail')).toHaveTextContent(
      'Errors started a minute after the deploy.'
    );
    expect(screen.queryByTestId('agenticInvestigationsTimelineRow')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('agenticInvestigationsImpactMapEventsBack'));
    expect(screen.getAllByTestId('agenticInvestigationsTimelineRow')).toHaveLength(2);
  });

  it('shows where the data of an event came from in a closed Evidence section', () => {
    const dataSource = {
      name: 'Elasticsearch',
      query: { language: 'ES|QL', text: 'FROM metrics-* | STATS count()' },
      api_call: { method: 'POST', type: '_query', endpoint: '/_query', payload: '{"size":1}' },
    };
    mockUseInvestigation.mockReturnValue({
      data: {
        in_progress: false,
        impact_map: {
          ...impactMap,
          events: impactMap.events?.map((event) => ({ ...event, data_source: dataSource })),
        },
      },
    });

    renderTab();
    fireEvent.click(screen.getByTestId('fakeEntity'));
    fireEvent.click(screen.getAllByTestId('agenticInvestigationsTimelineOpenEvent')[1]);

    const section = screen.getByTestId('agenticInvestigationsImpactMapEventDataSource');
    expect(section).toHaveTextContent('Evidence');
    expect(screen.getByRole('button', { name: /Evidence/ })).toHaveAttribute(
      'aria-expanded',
      'false'
    );
    expect(
      screen.getByTestId('agenticInvestigationsImpactMapEventDataSourceName')
    ).toHaveTextContent('Elasticsearch');
    expect(
      screen.getByTestId('agenticInvestigationsImpactMapEventDataSourceQuery')
    ).toHaveTextContent('FROM metrics-* | STATS count()');
    expect(
      screen.getByTestId('agenticInvestigationsImpactMapEventDataSourceApiCall')
    ).toHaveTextContent('POST /_query');
  });

  it('opens the Timeline tab on the event from "View in investigation timeline"', () => {
    mockUseInvestigation.mockReturnValue({ data: { in_progress: false, impact_map: impactMap } });
    const openTimeline = jest.fn();

    renderTab(openTimeline);
    fireEvent.click(screen.getByTestId('fakeEntity'));
    fireEvent.click(screen.getAllByTestId('agenticInvestigationsTimelineOpenEvent')[0]);
    fireEvent.click(screen.getByTestId('agenticInvestigationsImpactMapViewInTimeline'));

    expect(openTimeline).toHaveBeenCalledTimes(1);
    expect(takeTimelineEventFocus('conv-1')).toBe('e2');
    expect(takeTimelineEventFocus('conv-1')).toBeUndefined();
    expect(takeTimelineFocus('conv-1')).toEqual([]);
    expect(screen.queryByTestId('agenticInvestigationsImpactMapEventsFlyout')).toBeNull();
  });

  it('offers no timeline action when the flyout has no Timeline tab', () => {
    mockUseInvestigation.mockReturnValue({ data: { in_progress: false, impact_map: impactMap } });

    renderTab();
    fireEvent.click(screen.getByTestId('fakeEntity'));

    expect(screen.queryByTestId('agenticInvestigationsImpactMapViewInTimeline')).toBeNull();
  });

  describe('where the events flyout opens', () => {
    const openEntityEvents = () => {
      mockUseInvestigation.mockReturnValue({
        data: { in_progress: false, impact_map: impactMap },
      });
      mockUseIsInAgentBuilder.mockReturnValue(mockInAgentBuilder);
      mockEuiFlyout.mockClear();
      renderTab();
    };
    const lastFlyoutProps = () => mockEuiFlyout.mock.lastCall?.[0] as Record<string, unknown>;
    let mockInAgentBuilder = false;

    it('is a main flyout over the investigation flyout in Agent Builder', () => {
      mockInAgentBuilder = true;
      openEntityEvents();
      fireEvent.click(screen.getByTestId('fakeEntity'));

      expect(lastFlyoutProps()).toMatchObject({ session: 'start', type: 'push' });
    });

    it('is a child flyout anywhere else', () => {
      mockInAgentBuilder = false;
      openEntityEvents();
      fireEvent.click(screen.getByTestId('fakeEntity'));

      expect(lastFlyoutProps().session).toBeUndefined();
      expect(lastFlyoutProps().type).toBeUndefined();
    });

    it('is drawn inside the full-screen map, so nothing can sit above it', () => {
      mockInAgentBuilder = true;
      openEntityEvents();
      fireEvent.click(screen.getByTestId('agenticInvestigationsImpactMapMaximize'));
      fireEvent.click(screen.getAllByTestId('fakeEntity')[0]);

      const panel = screen.getByTestId('agenticInvestigationsImpactMapEventsFlyout');
      expect(screen.getByTestId('agenticInvestigationsImpactMapFullScreen')).toContainElement(
        panel
      );

      fireEvent.click(screen.getByTestId('agenticInvestigationsImpactMapEventsClose'));
      expect(screen.queryByTestId('agenticInvestigationsImpactMapEventsFlyout')).toBeNull();
      expect(screen.getByTestId('agenticInvestigationsImpactMapFullScreen')).toBeInTheDocument();
    });
  });

  it('still opens an entity or relationship that has no events, so its details show', async () => {
    mockUseInvestigation.mockReturnValue({
      data: { in_progress: false, impact_map: { ...impactMap, events: [] } },
    });

    renderTab();
    fireEvent.click(screen.getByTestId('fakeEntity'));

    expect(
      await screen.findByTestId('agenticInvestigationsImpactMapEventsFlyout')
    ).toHaveTextContent('payment');
    expect(screen.getByTestId('agenticInvestigationsImpactMapTimelineTab')).toHaveTextContent('0');
  });

  it('lists the events of a relationship', () => {
    mockUseInvestigation.mockReturnValue({ data: { in_progress: false, impact_map: impactMap } });

    renderTab();
    fireEvent.click(screen.getByTestId('fakeRelationship'));

    expect(screen.getByTestId('agenticInvestigationsImpactMapEventsFlyout')).toHaveTextContent(
      'checkout → payment'
    );
    expect(screen.getAllByTestId('agenticInvestigationsTimelineRow')).toHaveLength(1);
  });

  it('says the map is coming while the investigation runs without one', () => {
    mockUseInvestigation.mockReturnValue({ data: { in_progress: true } });

    renderTab();

    expect(screen.getByTestId('agenticInvestigationsImpactMapEmpty')).toHaveTextContent(
      'The investigation is still running'
    );
    expect(screen.queryByTestId('fakeImpactMapRenderer')).not.toBeInTheDocument();
  });

  it('shows the empty state for an investigation that ended without a map', () => {
    mockUseInvestigation.mockReturnValue({ data: { in_progress: false } });

    renderTab();

    expect(screen.getByTestId('agenticInvestigationsImpactMapEmpty')).toHaveTextContent(
      'No impact map yet'
    );
  });
});

describe('withContextAnnotations', () => {
  const chart = {
    type: 'line' as const,
    title: 'Restarts',
    x_axis: { type: 'time' as const },
    y_axis: {},
    series: [
      {
        name: 'restarts',
        points: [
          { x: '2026-11-07T09:55:00.000Z', y: 0 },
          { x: '2026-11-07T10:10:00.000Z', y: 6 },
        ],
      },
    ],
  };
  const [deploy, failure] = impactMap.events;

  it('marks the event and the changes in its window that led to it', () => {
    const { chart: annotated } = withContextAnnotations({ chart }, failure, impactMap.events);
    expect(annotated?.annotations).toEqual([
      { x: deploy.at, label: deploy.title },
      { x: failure.at, label: failure.title },
    ]);
  });

  it("keeps the agent's own annotations and does not mark the same moment twice", () => {
    const own = { ...chart, annotations: [{ x: deploy.at, label: 'Deploy' }] };
    expect(
      withContextAnnotations({ chart: own }, failure, impactMap.events).chart?.annotations
    ).toEqual([
      { x: deploy.at, label: 'Deploy' },
      { x: failure.at, label: failure.title },
    ]);
  });

  it(
    'marks the mitigations and responder actions in the window, even with the' +
      " agent's own annotation",
    () => {
      const rollback = {
        id: 'rollback',
        kind: 'mitigation' as const,
        title: 'Rolled back',
        at: '2026-11-07T10:05:00.000Z',
      };
      const own = { ...chart, annotations: [{ x: failure.at, label: 'Failures begin' }] };
      const labels = withContextAnnotations({ chart: own }, failure, [
        ...impactMap.events,
        rollback,
      ]).chart?.annotations?.map(({ label }) => label);
      expect(labels).toContain('Rolled back');
      expect(labels).toContain('Failures begin');
    }
  );
});

describe('getEntityIcon', () => {
  const type = (
    icon: object | undefined,
    kind: 'service' | 'dependency' | 'infrastructure' = 'service'
  ) => ({
    id: 'checkout_service',
    label: 'Checkout service',
    kind,
    icon,
  });

  it('keeps an icon EUI has and swaps one it does not for a generic one', () => {
    expect(getEntityIcon(type({ eui_icon: 'logoDocker' }))).toBe('logoDocker');
    expect(getEntityIcon(type({ eui_icon: 'logoGolang' }))).toBe('apps');
    expect(getEntityIcon(undefined)).toBe('apps');
  });

  it('draws a Kubernetes object and a dependency by what they are', () => {
    expect(getEntityIcon({ ...type(undefined), id: 'k8s_deployment' })).toBe('logoKubernetes');
    expect(getEntityIcon(type({ span_type: 'db' }, 'dependency'))).toBe('database');
    expect(getEntityIcon(type(undefined, 'dependency'))).toBe('globe');
  });

  it('names the stored kind as the type', () => {
    expect(getEntityKindLabel('infrastructure')).toBe('Infrastructure');
  });
});
