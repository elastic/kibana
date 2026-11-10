/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiButtonIcon,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFocusTrap,
  EuiPanel,
  EuiPortal,
  EuiSkeletonRectangle,
  EuiSpacer,
  EuiText,
  EuiTimeline,
  EuiTimelineItem,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedDate, FormattedRelative } from '@kbn/i18n-react';
import type { ImpactMapSlotRenderProps } from '@kbn/agentic-investigations-common';
import type { InvestigationImpactMapResponse } from '../../../../../common';
import { useInvestigation } from '../../../../investigations/hooks/use_investigation';
import type { ImpactMapRenderer } from '../../../../types';
import {
  ImpactMapEventsFlyout,
  withRecoveredHealth,
  STANDALONE_WIDTH,
  resolveEventsSelection,
  type EventsSelection,
} from './impact_map_events';
import { KindAvatar, TimelineEvent } from './timeline_event';
import { requestTimelineFocus } from './timeline_focus';
import { useIsInAgentBuilder } from './use_is_in_agent_builder';

/** Used until the map has been measured, and while loading. */
const MAP_HEIGHT = 'clamp(320px, calc(100vh - 480px), 900px)';
const MIN_MAP_HEIGHT = 320;
const MAX_MAP_HEIGHT = 900;
/** Room the flyout's footer takes under the map, plus a margin. */
const FOOTER_RESERVE = 88;

/**
 * A height that runs from where the map starts to just above the footer, wherever the header's
 * title wraps to, so the map neither leaves a gap below it nor pushes its controls out of view.
 */
const useFillHeight = () => {
  const ref = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number>();
  const measure = () => {
    const top = ref.current?.getBoundingClientRect().top;
    if (top === undefined) return;
    const next = Math.round(
      Math.min(MAX_MAP_HEIGHT, Math.max(MIN_MAP_HEIGHT, window.innerHeight - top - FOOTER_RESERVE))
    );
    setHeight((current) => (current === next ? current : next));
  };
  // After every render: the title above can wrap differently without this component resizing.
  useLayoutEffect(measure);
  useEffect(() => {
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);
  return { ref, height };
};

const DEFAULT_TITLE = i18n.translate('xpack.agenticInvestigations.impactMap.defaultTitle', {
  defaultMessage: 'Impact map',
});
const EMPTY_TITLE = i18n.translate('xpack.agenticInvestigations.impactMap.emptyTitle', {
  defaultMessage: 'No impact map yet',
});
const EMPTY_BODY = i18n.translate('xpack.agenticInvestigations.impactMap.emptyBody', {
  defaultMessage:
    'The agent draws the map once it knows which entities the problem touches and how they depend on each other.',
});
const EMPTY_BODY_RUNNING = i18n.translate(
  'xpack.agenticInvestigations.impactMap.emptyBodyRunning',
  {
    defaultMessage:
      'The investigation is still running. The map appears here once the agent knows which entities the problem touches.',
  }
);
const CLOSE_FULL_SCREEN_LABEL = i18n.translate('xpack.agenticInvestigations.impactMap.exit', {
  defaultMessage: 'Exit full screen',
});
const UPDATED_LABEL = i18n.translate('xpack.agenticInvestigations.impactMap.updated', {
  defaultMessage: 'Updated',
});

/**
 * The Impact map tab: the investigation's impact map, drawn by the renderer a solution registered.
 * The map is read with the rest of the investigation, so it updates as the agent revises it.
 */
export const ImpactMapTab: React.FC<ImpactMapSlotRenderProps & { Renderer: ImpactMapRenderer }> = ({
  conversationId,
  Renderer,
  openTimeline,
}) => {
  const { data, isLoading } = useInvestigation(conversationId);

  if (isLoading) {
    return <EuiSkeletonRectangle width="100%" height={MAP_HEIGHT} borderRadius="m" />;
  }

  const impactMap = data?.impact_map;
  if (!impactMap || impactMap.entities.length === 0) {
    return (
      <EuiEmptyPrompt
        data-test-subj="agenticInvestigationsImpactMapEmpty"
        iconType="graphApp"
        title={<h3>{EMPTY_TITLE}</h3>}
        titleSize="xs"
        body={<p>{data?.in_progress ? EMPTY_BODY_RUNNING : EMPTY_BODY}</p>}
      />
    );
  }

  return (
    <ImpactMapPanel
      impactMap={impactMap}
      Renderer={Renderer}
      conversationId={conversationId}
      openTimeline={openTimeline}
    />
  );
};

/** The events of one target in the Timeline tab's own style. */
const EventsTimeline: React.FC<{
  events: InvestigationImpactMapResponse['events'];
  impactMap: InvestigationImpactMapResponse;
  onOpen: (eventId: string) => void;
}> = ({ events, impactMap, onOpen }) => {
  const firstAt = Math.min(...impactMap.events.map(({ at }) => Date.parse(at)));
  return (
    <EuiTimeline gutterSize="m" data-test-subj="agenticInvestigationsImpactMapEventsTimeline">
      {events.map((event) => (
        <EuiTimelineItem
          key={event.id}
          verticalAlign="center"
          icon={<KindAvatar kind={event.kind} />}
        >
          <TimelineEvent
            event={event}
            impactMap={impactMap}
            firstAt={firstAt}
            selected={false}
            onOpen={() => onOpen(event.id)}
          />
        </EuiTimelineItem>
      ))}
    </EuiTimeline>
  );
};

const ImpactMapPanel: React.FC<{
  impactMap: InvestigationImpactMapResponse;
  Renderer: ImpactMapRenderer;
  conversationId: string;
  openTimeline?: () => void;
}> = ({ impactMap, Renderer, conversationId, openTimeline }) => {
  const isInAgentBuilder = useIsInAgentBuilder();
  const fill = useFillHeight();
  const [isMaximized, setIsMaximized] = useState(false);
  const [selection, setSelection] = useState<EventsSelection>();
  // Escape closes the events flyout first, and only then the full-screen map.
  const selectionRef = useRef(selection);
  selectionRef.current = selection;

  useEffect(() => {
    if (!isMaximized) {
      return;
    }
    const exitOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !selectionRef.current) {
        setIsMaximized(false);
      }
    };
    document.addEventListener('keydown', exitOnEscape);
    return () => document.removeEventListener('keydown', exitOnEscape);
  }, [isMaximized]);
  const modalTitleId = useGeneratedHtmlId({ prefix: 'impactMapModalTitle' });
  const title = impactMap.title?.trim() || DEFAULT_TITLE;
  const { euiTheme } = useEuiTheme();
  const updatedAt = new Date(impactMap.updated_at ?? impactMap.created_at);
  const viewInTimeline = openTimeline
    ? (current: EventsSelection, eventId?: string) => {
        const relationship =
          current.kind === 'relationship'
            ? impactMap.relationships.find(({ id }) => id === current.id)
            : undefined;
        const entityIds =
          current.kind === 'entity'
            ? [current.id]
            : relationship
            ? [relationship.source_id, relationship.target_id]
            : [];
        requestTimelineFocus(conversationId, eventId ? [] : entityIds, eventId);
        setSelection(undefined);
        setIsMaximized(false);
        openTimeline();
      }
    : undefined;
  // Open for any entity or relationship on the map. Type, description and metadata are useful
  // even when nothing has been recorded as an event yet — a silent click feels broken.
  const open = (next: EventsSelection) => {
    if (next.kind === 'entity' && !impactMap.entities.some(({ id }) => id === next.id)) {
      return;
    }
    if (next.kind === 'relationship' && !impactMap.relationships.some(({ id }) => id === next.id)) {
      return;
    }
    setSelection(next);
  };
  const openEntity = (id: string) => open({ kind: 'entity', id });
  const openRelationship = (id: string) => open({ kind: 'relationship', id });
  const map = (
    <Renderer
      impactMap={withRecoveredHealth(impactMap)}
      isFullScreen={isMaximized}
      onToggleFullScreen={() => setIsMaximized(!isMaximized)}
      onEntityClick={openEntity}
      onRelationshipClick={openRelationship}
    />
  );

  const eventsFlyout = selection && (
    <ImpactMapEventsFlyout
      // A new selection starts on its own list, not on the last one's open event.
      targetKey={`${selection.kind}:${selection.id}`}
      {...resolveEventsSelection(selection, impactMap)}
      renderEvents={(events, onOpen) => (
        <EventsTimeline events={events} impactMap={impactMap} onOpen={onOpen} />
      )}
      impactMap={impactMap}
      standalone={isMaximized}
      asMainFlyout={isInAgentBuilder}
      onViewInTimeline={
        viewInTimeline ? (eventId) => viewInTimeline(selection, eventId) : undefined
      }
      onClose={() => setSelection(undefined)}
    />
  );

  return (
    <EuiPanel
      hasBorder={false}
      hasShadow={false}
      paddingSize="none"
      color="transparent"
      data-test-subj="agenticInvestigationsImpactMap"
    >
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem>
          <EuiTitle size="xs">
            <h3>{title}</h3>
          </EuiTitle>
          <EuiText size="xs" color="subdued" data-test-subj="agenticInvestigationsImpactMapUpdated">
            {UPDATED_LABEL}{' '}
            <EuiToolTip
              content={<FormattedDate value={updatedAt} dateStyle="medium" timeStyle="medium" />}
            >
              <FormattedRelative value={updatedAt} />
            </EuiToolTip>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <div
        ref={fill.ref}
        css={css`
          height: ${fill.height ? `${fill.height}px` : MAP_HEIGHT};
          border: ${euiTheme.border.thin};
          border-radius: ${euiTheme.border.radius.medium};
          overflow: hidden;
        `}
      >
        {map}
      </div>
      {isMaximized && (
        <EuiPortal>
          <EuiFocusTrap disabled={Boolean(selection)}>
            <div
              role="dialog"
              aria-labelledby={modalTitleId}
              data-test-subj="agenticInvestigationsImpactMapFullScreen"
              css={css`
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                z-index: ${euiTheme.levels.modal};
                display: flex;
                flex-direction: column;
                background: ${euiTheme.colors.backgroundBasePlain};
              `}
            >
              <EuiFlexGroup
                alignItems="center"
                responsive={false}
                css={css`
                  flex: none;
                  padding: ${euiTheme.size.m};
                  /* Stays clear of the events panel, which runs the full height of the screen. */
                  padding-inline-end: ${selection
                    ? `calc(${STANDALONE_WIDTH} + ${euiTheme.size.m})`
                    : euiTheme.size.m};
                `}
              >
                <EuiFlexItem>
                  <EuiTitle size="s">
                    <h2 id={modalTitleId}>{title}</h2>
                  </EuiTitle>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiToolTip content={CLOSE_FULL_SCREEN_LABEL} disableScreenReaderOutput>
                    <EuiButtonIcon
                      iconType="cross"
                      aria-label={CLOSE_FULL_SCREEN_LABEL}
                      data-test-subj="agenticInvestigationsImpactMapExitFullScreen"
                      onClick={() => setIsMaximized(false)}
                    />
                  </EuiToolTip>
                </EuiFlexItem>
              </EuiFlexGroup>
              <div
                css={css`
                  flex: 1;
                  min-height: 0;
                  position: relative;
                `}
              >
                <div
                  css={css`
                    position: absolute;
                    inset: 0;
                    /* The map gives up the panel's width, so no node hides behind it. */
                    inset-inline-end: ${selection ? STANDALONE_WIDTH : 0};
                  `}
                >
                  {map}
                </div>
              </div>
              {/* Inside the overlay, so it is above the map whatever EUI's z-index, and as tall as the screen. */}
              {selection && eventsFlyout}
            </div>
          </EuiFocusTrap>
        </EuiPortal>
      )}
      {selection && !isMaximized && eventsFlyout}
    </EuiPanel>
  );
};
