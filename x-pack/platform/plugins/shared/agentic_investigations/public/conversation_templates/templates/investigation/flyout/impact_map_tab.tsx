/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useRef, useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiButtonIcon,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiFocusTrap,
  EuiPanel,
  EuiPortal,
  EuiSkeletonRectangle,
  EuiSpacer,
  EuiText,
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
import { resolveEventsSelection, type EventsSelection } from './impact_map_events';
import { TimelineTab } from './timeline_tab';
import { requestTimelineFocus } from './timeline_focus';

/** Fills the flyout below its header and tabs; the controls sit at the top, so nothing hides them. */
const MAP_HEIGHT = 'clamp(320px, calc(100vh - 280px), 900px)';

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
const TIMELINE_TITLE = i18n.translate('xpack.agenticInvestigations.impactMap.timelineTitle', {
  defaultMessage: 'Timeline',
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

const ImpactMapPanel: React.FC<{
  impactMap: InvestigationImpactMapResponse;
  Renderer: ImpactMapRenderer;
  conversationId: string;
  openTimeline?: () => void;
}> = ({ impactMap, Renderer, conversationId, openTimeline }) => {
  const [isMaximized, setIsMaximized] = useState(false);
  // The timeline flyout over the full-screen map, or where the host has no Timeline tab.
  const [selection, setSelection] = useState<EventsSelection>();
  // Escape closes the timeline flyout first, and only then the full-screen map.
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
  const timelineTitleId = useGeneratedHtmlId({ prefix: 'impactMapTimelineTitle' });
  const modalTitleId = useGeneratedHtmlId({ prefix: 'impactMapModalTitle' });
  const title = impactMap.title?.trim() || DEFAULT_TITLE;
  const { euiTheme } = useEuiTheme();
  const updatedAt = new Date(impactMap.updated_at ?? impactMap.created_at);
  // A click goes to the Timeline tab filtered by the target. Over the full-screen map, or with no
  // Timeline tab to go to, the timeline opens as a flyout instead. A target with no events does
  // nothing.
  const open = (next: EventsSelection) => {
    if (resolveEventsSelection(next, impactMap).events.length === 0) {
      return;
    }
    const relationship =
      next.kind === 'relationship'
        ? impactMap.relationships.find(({ id }) => id === next.id)
        : undefined;
    const entityIds =
      next.kind === 'entity'
        ? [next.id]
        : relationship
        ? [relationship.source_id, relationship.target_id]
        : [];
    requestTimelineFocus(conversationId, entityIds);
    if (openTimeline && !isMaximized) {
      openTimeline();
    } else {
      setSelection(next);
    }
  };
  const openEntity = (id: string) => open({ kind: 'entity', id });
  const openRelationship = (id: string) => open({ kind: 'relationship', id });
  const map = (
    <Renderer
      impactMap={impactMap}
      isFullScreen={isMaximized}
      onToggleFullScreen={() => setIsMaximized(!isMaximized)}
      onEntityClick={openEntity}
      onRelationshipClick={openRelationship}
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
        css={css`
          height: ${MAP_HEIGHT};
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
                  `}
                >
                  {map}
                </div>
              </div>
            </div>
          </EuiFocusTrap>
        </EuiPortal>
      )}
      {selection && (
        <EuiPortal>
          <EuiFlyout
            // A new selection starts on its own filter.
            key={`${selection.kind}:${selection.id}`}
            onClose={() => setSelection(undefined)}
            aria-labelledby={timelineTitleId}
            size="m"
            ownFocus
            session="never"
            type="overlay"
            css={css`
              z-index: ${Number(euiTheme.levels.modal) + 1};
            `}
            data-test-subj="agenticInvestigationsImpactMapTimelineFlyout"
          >
            <EuiFlyoutHeader hasBorder>
              <EuiTitle size="s">
                <h2 id={timelineTitleId}>{TIMELINE_TITLE}</h2>
              </EuiTitle>
            </EuiFlyoutHeader>
            <EuiFlyoutBody>
              <TimelineTab conversationId={conversationId} embedded />
            </EuiFlyoutBody>
          </EuiFlyout>
        </EuiPortal>
      )}
    </EuiPanel>
  );
};
