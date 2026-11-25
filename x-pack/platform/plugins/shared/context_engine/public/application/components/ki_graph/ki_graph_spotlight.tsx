/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiHorizontalRule,
  EuiIcon,
  EuiLink,
  EuiPanel,
  euiTextTruncate,
  EuiSkeletonText,
  EuiText,
  EuiToolTip,
  transparentize,
  useEuiFontSize,
  useEuiTheme,
} from '@elastic/eui';
import { css, keyframes } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { formatKiTypeLabel } from '../../utils/ki_display';
import { KiFormattedDate } from '../ki/shared/ki_formatted_date';
import { kiLabelCapitalizeCss } from '../ki/shared/ki_type_display';
import type { SpotlightGroup, SpotlightModel } from './get_spotlight_model';
import { getKiGraphNodeIcon } from './ki_graph_node_icon';
import type { KiGraphSource } from './ki_graph_source';
import type { KiGraphNodeData, KiGraphNodeKind } from './types';
import {
  useSpotlightWires,
  type SpotlightWireSpec,
  type SpotlightWireSide,
} from './use_spotlight_wires';

const SPOTLIGHT_BACKDROP_ALPHA = 0.98;
const SPOTLIGHT_TOP_NEIGHBORS = 3;
const SPOTLIGHT_EXPANDED_SCROLL_AT = 8;
const SPOTLIGHT_HERO_WIDTH = 340;
const SPOTLIGHT_COLUMN_GAP = 'clamp(96px, 9vw, 150px)';
const SPOTLIGHT_WIRE_MARKER_ID = 'contextKiGraphSpotlightWireArrow';
const PILL_MAX_WIDTH = 160;

const closeLabel = i18n.translate('xpack.contextEngine.kiGraph.spotlight.close', {
  defaultMessage: 'Close spotlight',
});

const viewDocumentLabel = i18n.translate('xpack.contextEngine.kiGraph.spotlight.viewDocument', {
  defaultMessage: 'View document',
});

const cameFromLabel = i18n.translate('xpack.contextEngine.kiGraph.spotlight.cameFrom', {
  defaultMessage: 'Came from',
});

const mentionedByLabel = i18n.translate('xpack.contextEngine.kiGraph.spotlight.mentionedBy', {
  defaultMessage: 'Mentioned by',
});

const connectedToLabel = i18n.translate('xpack.contextEngine.kiGraph.spotlight.connectedTo', {
  defaultMessage: 'Connected to',
});

const entityKindLabel = i18n.translate('xpack.contextEngine.kiGraph.spotlight.entityKind', {
  defaultMessage: 'Entity',
});

const factKindLabel = i18n.translate('xpack.contextEngine.kiGraph.spotlight.factKind', {
  defaultMessage: 'Fact',
});

const statOccurrencesLabel = i18n.translate(
  'xpack.contextEngine.kiGraph.spotlight.statOccurrences',
  {
    defaultMessage: 'Occurrences',
  }
);

const statConnectionsLabel = i18n.translate(
  'xpack.contextEngine.kiGraph.spotlight.statConnections',
  {
    defaultMessage: 'Connections',
  }
);

const statLastSeenLabel = i18n.translate('xpack.contextEngine.kiGraph.spotlight.statLastSeen', {
  defaultMessage: 'Last seen',
});

const derivedFromLabel = i18n.translate('xpack.contextEngine.kiGraph.spotlight.derivedFrom', {
  defaultMessage: 'derived from',
});

const occurrencesBadgeLabel = (count: number): string =>
  i18n.translate('xpack.contextEngine.kiGraph.spotlight.occurrencesBadge', {
    defaultMessage: '{count, plural, one {# occurrence} other {# occurrences}}',
    values: { count },
  });

const moreConnectedLabel = (count: number): string =>
  i18n.translate('xpack.contextEngine.kiGraph.spotlight.moreConnected', {
    defaultMessage: '+{count} more connected',
    values: { count },
  });

const showLessLabel = i18n.translate('xpack.contextEngine.kiGraph.spotlight.showLess', {
  defaultMessage: 'Show less',
});

const neighborLinkLabel = (title: string): string =>
  i18n.translate('xpack.contextEngine.kiGraph.spotlight.selectNeighbor', {
    defaultMessage: 'Open {title}',
    values: { title },
  });

const spotlightGroupKey = (side: SpotlightWireSide, relation: string): string =>
  `${side}:${relation}`;

const spotlightSourceKey = (sourceId: string): string => `source:${sourceId}`;

const kindLabel = (kind: KiGraphNodeKind): string =>
  kind === 'entity' ? entityKindLabel : factKindLabel;

const iconTileFill = (
  kind: KiGraphNodeKind,
  euiTheme: ReturnType<typeof useEuiTheme>['euiTheme']
): string =>
  kind === 'entity'
    ? euiTheme.colors.backgroundLightPrimary
    : euiTheme.colors.backgroundLightNeutral;

const iconTileColor = (
  kind: KiGraphNodeKind,
  euiTheme: ReturnType<typeof useEuiTheme>['euiTheme']
): string => (kind === 'entity' ? euiTheme.colors.textPrimary : euiTheme.colors.text);

const shortConversationId = (conversationId: string): string => {
  if (conversationId.length <= 12) {
    return conversationId;
  }
  return `${conversationId.slice(0, 6)}…${conversationId.slice(-4)}`;
};

export interface KiGraphSpotlightProps {
  model: SpotlightModel;
  onSelectNeighbor: (node: KiGraphNodeData) => void;
  onViewDocument: (node: KiGraphNodeData) => void;
  onClose: () => void;
  sources?: readonly KiGraphSource[];
  isLoadingSources?: boolean;
}

interface KiGraphNodeIconTileProps {
  kind: KiGraphNodeKind;
  subtype: string;
}

const KiGraphNodeIconTile = ({ kind, subtype }: KiGraphNodeIconTileProps) => {
  const { euiTheme } = useEuiTheme();
  const tileCss = css({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    width: euiTheme.size.xl,
    height: euiTheme.size.xl,
    borderRadius: euiTheme.border.radius.medium,
    background: iconTileFill(kind, euiTheme),
    color: iconTileColor(kind, euiTheme),
  });

  return (
    <span css={tileCss} aria-hidden>
      <EuiIcon type={getKiGraphNodeIcon(kind, subtype)} size="m" aria-hidden={true} />
    </span>
  );
};

interface SpotlightColumnHeaderProps {
  label: string;
}

const SpotlightColumnHeader = ({ label }: SpotlightColumnHeaderProps) => (
  <EuiText size="xs" color="subdued">
    <span>{label}</span>
  </EuiText>
);

interface SpotlightSourceCardProps {
  source: KiGraphSource;
  registerRef: (key: string) => (element: HTMLDivElement | null) => void;
}

const sourceMemoryIconType = (hasAgent: boolean): 'compute' | 'comment' =>
  hasAgent ? 'compute' : 'comment';

const SpotlightSourceIconTile = ({ hasAgent }: { hasAgent: boolean }) => {
  const { euiTheme } = useEuiTheme();
  const tileCss = css({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    width: euiTheme.size.xl,
    height: euiTheme.size.xl,
    borderRadius: euiTheme.border.radius.medium,
    background: euiTheme.colors.backgroundLightNeutral,
    color: euiTheme.colors.text,
  });

  return (
    <span css={tileCss} aria-hidden>
      <EuiIcon type={sourceMemoryIconType(hasAgent)} size="m" aria-hidden={true} />
    </span>
  );
};

const SpotlightSourceCard = ({ source, registerRef }: SpotlightSourceCardProps) => {
  const { euiTheme } = useEuiTheme();

  const SPOTLIGHT_SOURCE_TEXT_MAX = 220;

  const panelCss = css({
    pointerEvents: 'auto',
    maxWidth: '100%',
    minWidth: 0,
  });

  const titleCss = css(euiTextTruncate(`${SPOTLIGHT_SOURCE_TEXT_MAX}px`), {
    display: 'block',
    maxWidth: SPOTLIGHT_SOURCE_TEXT_MAX,
  });

  const agentCss = css(euiTextTruncate(`${SPOTLIGHT_SOURCE_TEXT_MAX}px`), {
    display: 'block',
    maxWidth: SPOTLIGHT_SOURCE_TEXT_MAX,
  });

  const conversationCss = css(euiTextTruncate(`${SPOTLIGHT_SOURCE_TEXT_MAX}px`), {
    display: 'block',
    fontFamily: euiTheme.font.familyCode,
    fontSize: euiTheme.font.scale.xs,
    color: euiTheme.colors.textSubdued,
    maxWidth: SPOTLIGHT_SOURCE_TEXT_MAX,
  });

  const bodyCss = css({
    display: 'flex',
    flexDirection: 'column',
    gap: euiTheme.size.xs,
    minWidth: 0,
    flex: 1,
  });

  const rowCss = css({
    display: 'flex',
    alignItems: 'flex-start',
    gap: euiTheme.size.s,
  });

  return (
    <div ref={registerRef(spotlightSourceKey(source.id))}>
      <EuiPanel
        hasBorder
        paddingSize="s"
        css={panelCss}
        data-test-subj={`contextKiGraphSpotlightSource-${source.id}`}
      >
        <div css={rowCss}>
          <SpotlightSourceIconTile hasAgent={source.agentName !== undefined} />
          <div css={bodyCss}>
            <EuiText size="s">
              <strong css={titleCss} title={source.title}>
                {source.title}
              </strong>
            </EuiText>
            {source.agentName !== undefined ? (
              <EuiText size="xs" color="subdued">
                <span css={agentCss} title={source.agentName}>
                  {source.agentName}
                </span>
              </EuiText>
            ) : null}
            {source.conversationId !== undefined ? (
              <span css={conversationCss} title={source.conversationId}>
                {shortConversationId(source.conversationId)}
              </span>
            ) : null}
            {source.recordedAt !== undefined ? (
              <EuiText size="xs" color="subdued">
                <KiFormattedDate value={source.recordedAt} />
              </EuiText>
            ) : null}
          </div>
        </div>
      </EuiPanel>
    </div>
  );
};

interface SpotlightGroupCardProps {
  group: SpotlightGroup;
  side: SpotlightWireSide;
  registerRef: (key: string) => (element: HTMLDivElement | null) => void;
  onSelectNeighbor: (node: KiGraphNodeData) => void;
  onExpandedChange: () => void;
}

const SpotlightGroupCard = ({
  group,
  side,
  registerRef,
  onSelectNeighbor,
  onExpandedChange,
}: SpotlightGroupCardProps) => {
  const { euiTheme } = useEuiTheme();
  const [expanded, setExpanded] = useState(false);

  const groupKey = spotlightGroupKey(side, group.relation);
  const hiddenCount = group.count - SPOTLIGHT_TOP_NEIGHBORS;
  const hasMore = hiddenCount > 0;
  const visibleNeighbors = expanded
    ? group.neighbors
    : group.neighbors.slice(0, SPOTLIGHT_TOP_NEIGHBORS);

  const toggleExpanded = (): void => {
    setExpanded((value) => !value);
    onExpandedChange();
  };

  const panelCss = css({
    pointerEvents: 'auto',
    position: 'relative',
  });

  const countBadgeCss = css({
    position: 'absolute',
    top: euiTheme.size.s,
    right: euiTheme.size.s,
  });

  const listCss = css({
    display: 'flex',
    flexDirection: 'column',
    gap: euiTheme.size.xs,
    maxHeight:
      expanded && group.neighbors.length > SPOTLIGHT_EXPANDED_SCROLL_AT
        ? `calc(${euiTheme.size.xl} * ${SPOTLIGHT_EXPANDED_SCROLL_AT})`
        : undefined,
    overflowY:
      expanded && group.neighbors.length > SPOTLIGHT_EXPANDED_SCROLL_AT ? 'auto' : undefined,
  });

  const rowCss = css({
    display: 'flex',
    alignItems: 'center',
    gap: euiTheme.size.s,
    minWidth: 0,
  });

  const linkCss = css({
    flex: 1,
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  });

  return (
    <div ref={registerRef(groupKey)}>
      <EuiPanel
        hasBorder
        paddingSize="s"
        css={panelCss}
        data-test-subj={`contextKiGraphSpotlightGroup-${side}-${group.relation}`}
      >
        {group.count > 1 ? (
          <span css={countBadgeCss}>
            <EuiBadge color="hollow">{group.count}</EuiBadge>
          </span>
        ) : null}

        <div css={listCss}>
          {visibleNeighbors.map(({ node }) => (
            <div key={node.kiId} css={rowCss}>
              <KiGraphNodeIconTile kind={node.kind} subtype={node.subtype} />
              <EuiLink
                css={linkCss}
                color="text"
                onClick={() => onSelectNeighbor(node)}
                aria-label={neighborLinkLabel(node.title)}
                data-test-subj={`contextKiGraphSpotlightNeighbor-${node.kiId}`}
              >
                {node.title}
              </EuiLink>
            </div>
          ))}
        </div>

        {hasMore ? (
          <EuiButtonEmpty
            size="xs"
            flush="left"
            iconType="plusCircle"
            onClick={toggleExpanded}
            aria-expanded={expanded}
            data-test-subj={`contextKiGraphSpotlightExpand-${side}-${group.relation}`}
          >
            {expanded ? showLessLabel : moreConnectedLabel(hiddenCount)}
          </EuiButtonEmpty>
        ) : null}
      </EuiPanel>
    </div>
  );
};

interface SpotlightHeroStatProps {
  label: string;
  value: React.ReactNode;
}

const SpotlightHeroStat = ({ label, value }: SpotlightHeroStatProps) => {
  const { euiTheme } = useEuiTheme();
  const statCss = css({
    display: 'flex',
    flexDirection: 'column',
    gap: euiTheme.size.xs,
  });

  return (
    <div css={statCss}>
      <EuiText size="xs" color="subdued">
        {label}
      </EuiText>
      <EuiText size="s">
        <strong>{value}</strong>
      </EuiText>
    </div>
  );
};

const spotlightFadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

export const KiGraphSpotlight = ({
  model,
  onSelectNeighbor,
  onViewDocument,
  onClose,
  sources,
  isLoadingSources,
}: KiGraphSpotlightProps) => {
  const { euiTheme } = useEuiTheme();
  const wirePillFontSize = useEuiFontSize('xs').fontSize;
  const containerRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const groupElementsRef = useRef<Map<string, HTMLDivElement>>(new Map());
  const [layoutRevision, setLayoutRevision] = useState(0);

  const registerGroup = useCallback(
    (key: string) => (element: HTMLDivElement | null) => {
      if (element === null) {
        groupElementsRef.current.delete(key);
        return;
      }
      groupElementsRef.current.set(key, element);
    },
    []
  );

  const getGroupElement = useCallback(
    (key: string): HTMLElement | undefined => groupElementsRef.current.get(key),
    []
  );

  const onExpandedChange = useCallback(() => {
    setLayoutRevision((value) => value + 1);
  }, []);

  useEffect(() => {
    setLayoutRevision((value) => value + 1);
  }, [sources, isLoadingSources, model.incoming, model.outgoing]);

  const showSourcesSection =
    isLoadingSources === true || (sources !== undefined && sources.length > 0);

  const wireSpecs = useMemo((): readonly SpotlightWireSpec[] => {
    const sourceSpecs: SpotlightWireSpec[] =
      sources?.map((source) => ({
        id: `source-${source.id}`,
        side: 'incoming',
        relation: derivedFromLabel,
        groupKey: spotlightSourceKey(source.id),
      })) ?? [];

    const incoming: SpotlightWireSpec[] = model.incoming.map((group) => ({
      id: `in-${group.relation}`,
      side: 'incoming',
      relation: group.relation,
      groupKey: spotlightGroupKey('incoming', group.relation),
    }));

    const outgoing: SpotlightWireSpec[] = model.outgoing.map((group) => ({
      id: `out-${group.relation}`,
      side: 'outgoing',
      relation: group.relation,
      groupKey: spotlightGroupKey('outgoing', group.relation),
    }));

    return [...sourceSpecs, ...incoming, ...outgoing];
  }, [model.incoming, model.outgoing, sources]);

  const wirePaths = useSpotlightWires(
    containerRef,
    heroRef,
    wireSpecs,
    getGroupElement,
    layoutRevision
  );

  const wireStroke = euiTheme.colors.lightShade;

  const rootCss = css({
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: transparentize(euiTheme.colors.backgroundBaseSubdued, SPOTLIGHT_BACKDROP_ALPHA),
    animation: `${spotlightFadeIn} ${euiTheme.animation.fast} ease-out`,
    pointerEvents: 'auto',
    boxSizing: 'border-box',
    overflow: 'hidden',
  });

  const wireLayerCss = css({
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
  });

  const gridCss = css({
    position: 'relative',
    display: 'grid',
    gridTemplateColumns: `minmax(220px, 1fr) ${SPOTLIGHT_HERO_WIDTH}px minmax(220px, 1fr)`,
    gap: SPOTLIGHT_COLUMN_GAP,
    alignItems: 'center',
    width: '100%',
    maxHeight: '100%',
    padding: euiTheme.size.l,
    boxSizing: 'border-box',
    pointerEvents: 'none',
  });

  const sectionCss = css({
    display: 'flex',
    flexDirection: 'column',
    gap: euiTheme.size.m,
    maxHeight: '100%',
    overflowY: 'auto',
    pointerEvents: 'auto',
  });

  const columnCss = css({
    maxHeight: '100%',
    minWidth: 0,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: euiTheme.size.l,
    pointerEvents: 'auto',
  });

  const heroCss = css({
    pointerEvents: 'auto',
    position: 'relative',
    width: SPOTLIGHT_HERO_WIDTH,
  });

  const closeCss = css({
    position: 'absolute',
    top: euiTheme.size.s,
    right: euiTheme.size.s,
  });

  const heroTitleCss = css({
    display: '-webkit-box',
    WebkitLineClamp: 3,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
    wordBreak: 'break-word',
    margin: 0,
  });

  const heroHeaderCss = css({
    display: 'flex',
    alignItems: 'flex-start',
    gap: euiTheme.size.m,
    paddingRight: euiTheme.size.xl,
  });

  const badgesRowCss = css({
    display: 'flex',
    flexWrap: 'wrap',
    gap: euiTheme.size.s,
    alignItems: 'center',
  });

  const statGridCss = css({
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: euiTheme.size.m,
  });

  const wirePillCss = (left: number, top: number) =>
    css({
      position: 'absolute',
      left,
      top,
      transform: 'translate(-50%, -50%)',
      pointerEvents: 'none',
      zIndex: euiTheme.levels.content,
      maxWidth: PILL_MAX_WIDTH,
      padding: `${euiTheme.size.xs} ${euiTheme.size.s}`,
      fontSize: wirePillFontSize,
      fontWeight: euiTheme.font.weight.semiBold,
      lineHeight: euiTheme.font.lineHeightMultiplier,
      color: euiTheme.colors.textPrimary,
      background: euiTheme.colors.backgroundLightPrimary,
      borderRadius: euiTheme.border.radius.medium,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
    });

  const handleBackdropClick = (event: React.MouseEvent<HTMLDivElement>): void => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  const { node } = model;
  const connectionCount = model.incomingCount + model.outgoingCount;
  const occurrencesValue =
    node.occurrences !== undefined
      ? String(node.occurrences)
      : i18n.translate('xpack.contextEngine.kiGraph.spotlight.statNone', {
          defaultMessage: 'None',
        });
  const subtypeLabel = formatKiTypeLabel(node.subtype);

  return (
    <div
      ref={containerRef}
      css={rootCss}
      data-test-subj="contextKiGraphSpotlight"
      onClick={handleBackdropClick}
      role="presentation"
    >
      <svg css={wireLayerCss} aria-hidden data-test-subj="contextKiGraphSpotlightWires">
        <defs>
          <marker
            id={SPOTLIGHT_WIRE_MARKER_ID}
            markerWidth="8"
            markerHeight="8"
            refX="7"
            refY="4"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path
              d="M 0 0 L 8 4 L 0 8"
              fill="none"
              stroke={wireStroke}
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </marker>
        </defs>
        {wirePaths.map((wire) => (
          <path
            key={wire.id}
            d={wire.path}
            fill="none"
            stroke={wireStroke}
            strokeWidth={1.5}
            markerEnd={`url(#${SPOTLIGHT_WIRE_MARKER_ID})`}
          />
        ))}
      </svg>

      <div css={gridCss}>
        <div css={columnCss} data-test-subj="contextKiGraphSpotlightIncoming">
          {showSourcesSection ? (
            <div css={sectionCss}>
              <SpotlightColumnHeader label={cameFromLabel} />
              {isLoadingSources === true ? (
                <EuiPanel hasBorder paddingSize="s">
                  <EuiSkeletonText lines={2} />
                </EuiPanel>
              ) : (
                sources?.map((source) => (
                  <SpotlightSourceCard
                    key={source.id}
                    source={source}
                    registerRef={registerGroup}
                  />
                ))
              )}
            </div>
          ) : null}

          {model.incoming.length > 0 ? (
            <div css={sectionCss}>
              <SpotlightColumnHeader label={mentionedByLabel} />
              {model.incoming.map((group) => (
                <SpotlightGroupCard
                  key={group.relation}
                  group={group}
                  side="incoming"
                  registerRef={registerGroup}
                  onSelectNeighbor={onSelectNeighbor}
                  onExpandedChange={onExpandedChange}
                />
              ))}
            </div>
          ) : null}
        </div>

        <div ref={heroRef} css={heroCss}>
          <EuiPanel hasShadow paddingSize="l">
            <div css={closeCss}>
              <EuiToolTip content={closeLabel} disableScreenReaderOutput>
                <EuiButtonIcon
                  iconType="cross"
                  color="text"
                  aria-label={closeLabel}
                  onClick={onClose}
                  data-test-subj="contextKiGraphSpotlightClose"
                />
              </EuiToolTip>
            </div>

            <div css={heroHeaderCss}>
              <KiGraphNodeIconTile kind={node.kind} subtype={node.subtype} />
              <div>
                <EuiText size="m">
                  <h2 css={heroTitleCss} data-test-subj="contextKiGraphSpotlightHeroTitle">
                    {node.title}
                  </h2>
                </EuiText>
                <EuiText size="s" color="subdued" css={kiLabelCapitalizeCss}>
                  {subtypeLabel}
                </EuiText>
              </div>
            </div>

            <p css={css({ margin: `${euiTheme.size.s} 0` })}>
              <span css={badgesRowCss}>
                <EuiBadge color="hollow">{kindLabel(node.kind)}</EuiBadge>
                {node.occurrences !== undefined ? (
                  <EuiBadge color="default" data-test-subj="contextKiGraphSpotlightOccurrences">
                    {occurrencesBadgeLabel(node.occurrences)}
                  </EuiBadge>
                ) : null}
              </span>
            </p>

            <EuiHorizontalRule margin="m" />

            <div css={statGridCss}>
              <SpotlightHeroStat label={statOccurrencesLabel} value={occurrencesValue} />
              <SpotlightHeroStat
                label={statConnectionsLabel}
                value={
                  <span data-test-subj="contextKiGraphSpotlightRelationCounts">
                    {connectionCount}
                  </span>
                }
              />
              {node.lastSeenAt !== undefined ? (
                <SpotlightHeroStat
                  label={statLastSeenLabel}
                  value={<KiFormattedDate value={node.lastSeenAt} />}
                />
              ) : null}
            </div>

            <p css={css({ margin: `${euiTheme.size.m} 0 0` })}>
              <EuiButton
                size="s"
                fill
                fullWidth
                onClick={() => onViewDocument(node)}
                data-test-subj="contextKiGraphSpotlightViewDocument"
              >
                {viewDocumentLabel}
              </EuiButton>
            </p>
          </EuiPanel>
        </div>

        <div css={columnCss} data-test-subj="contextKiGraphSpotlightOutgoing">
          {model.outgoing.length > 0 ? (
            <div css={sectionCss}>
              <SpotlightColumnHeader label={connectedToLabel} />
              {model.outgoing.map((group) => (
                <SpotlightGroupCard
                  key={group.relation}
                  group={group}
                  side="outgoing"
                  registerRef={registerGroup}
                  onSelectNeighbor={onSelectNeighbor}
                  onExpandedChange={onExpandedChange}
                />
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {wirePaths.map((wire) => (
        <span key={`${wire.id}-pill`} css={wirePillCss(wire.pillX, wire.pillY)}>
          {wire.relation}
        </span>
      ))}
    </div>
  );
};
