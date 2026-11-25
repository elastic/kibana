/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiAvatar,
  EuiIcon,
  EuiPopover,
  EuiText,
  EuiToolTip,
  useEuiTheme,
  useResizeObserver,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type {
  ImpactMapEvent,
  ImpactMapEventKind,
  InvestigationImpactMapResponse,
} from '../../common';
import { formatTimelineClock, type TimelineSummaryData } from '../../common';
import { EventHoverCard } from './event_hover_card';
import { getEventGroup } from '../conversation_templates/templates/investigation/flyout/impact_map_events';

const DOT_SIZES = { s: 24, m: 32, l: 40 } as const;

/**
 * A solid circle in the colour of the event's kind, with the kind's icon in white. With `quiet`
 * it shows no tooltip of its own, for where the circle already has a hover card.
 */
export const KindDot: React.FC<{
  kind: ImpactMapEventKind;
  size?: 's' | 'm' | 'l';
  quiet?: boolean;
}> = ({ kind, size = 'm', quiet = false }) => {
  const { euiTheme } = useEuiTheme();
  const { icon, color, label } = getEventGroup(kind);
  if (kind === 'alert') {
    // An alert is the red triangle, as on the evidence charts, on a white backing so the line and
    // the shaded band do not show through it.
    return (
      <span
        css={css`
          display: inline-flex;
          align-items: center;
          justify-content: center;
          inline-size: ${DOT_SIZES[size]}px;
          block-size: ${DOT_SIZES[size]}px;
          border-radius: 50%;
          background: ${euiTheme.colors.backgroundBasePlain};
        `}
      >
        <EuiIcon
          type="warning"
          color={euiTheme.colors.danger}
          size={size === 's' ? 'm' : 'l'}
          title={quiet ? undefined : label}
          aria-label={label}
        />
      </span>
    );
  }
  if (quiet) {
    const diameter = DOT_SIZES[size];
    return (
      <span
        role="img"
        aria-label={label}
        css={css`
          display: inline-flex;
          align-items: center;
          justify-content: center;
          inline-size: ${diameter}px;
          block-size: ${diameter}px;
          border-radius: 50%;
          background: ${euiTheme.colors[color]};
        `}
      >
        <EuiIcon type={icon} color="ghost" size={size === 's' ? 's' : 'm'} aria-hidden />
      </span>
    );
  }
  return (
    <EuiAvatar
      name={label}
      size={size}
      iconType={icon}
      iconColor="ghost"
      color={euiTheme.colors[color]}
    />
  );
};

const CUSTOMER_IMPACT = i18n.translate(
  'xpack.agenticInvestigations.timelineSummary.customerImpact',
  { defaultMessage: 'Customer impact' }
);

const NODE_SIZE = 28;
const HIDDEN_SIZE = 20;
const PAD = 4;
const LABEL_WIDTH = 118;
/** A label is its time and one line of text. */
const LABEL_HEIGHT = 36;
/** Steps no closer than this, so two at nearly the same time do not sit on one another. */
const MIN_STEP_GAP = NODE_SIZE + 4;
/** Steps with hidden events between them are kept this far apart, which is room for the count. */
const GAP_FOR_COUNT = NODE_SIZE + HIDDEN_SIZE + 10;
const FALLBACK_WIDTH = 900;
const MAX_FALLBACK_LENGTH = 60;

/**
 * What an SRE scans for next to a step: the event's quick reference, a plain sentence. An event
 * from before it existed gets its title, cut short at a word.
 */
const shortTextOf = (event: ImpactMapEvent): string => {
  if (event.summary?.trim()) return event.summary.trim();
  const title = event.title.trim();
  if (title.length <= MAX_FALLBACK_LENGTH) return title;
  const cut = title.slice(0, MAX_FALLBACK_LENGTH);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(' '), 20))}…`;
};

/** Which event speaks for a cluster of steps, first of these kinds. */
const CLUSTER_PRIORITY: ImpactMapEventKind[] = [
  'root_cause',
  'customer_impact',
  'failure',
  'alert',
  'change',
  'mitigation',
  'recovery',
  'condition',
  'anomaly',
  'investigation',
  'response',
];

/**
 * The key events of an investigation as a sequence on one short line, evenly spaced from one end
 * to the other, each with its time and a line of text; the whole timeline is where real time is
 * drawn to scale. Steps too close for their own labels share one. The impact is a lightly shaded
 * band around the steps inside it with a thin line at each end, and a count on the line shows the
 * events hidden between two steps, which opens the whole timeline on them. Hovering a step shows
 * its key information.
 */
export const TimelineSummary: React.FC<{
  data: TimelineSummaryData;
  onOpenEvent: (eventId: string) => void;
  /** Opens the whole timeline on the events hidden between two steps. */
  onOpenHidden: (hiddenEventIds: string[]) => void;
  /** With the impact map, hovering a step shows its key information. */
  impactMap?: InvestigationImpactMapResponse;
}> = ({ data: { events, windows, hiddenBetween }, onOpenEvent, onOpenHidden, impactMap }) => {
  const { euiTheme } = useEuiTheme();
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const [hoverId, setHoverId] = useState<string>();
  const { width: measured } = useResizeObserver(container);
  const width = measured || FALLBACK_WIDTH;
  const count = events.length;
  const times = useMemo(() => events.map(({ at }) => Date.parse(at)), [events]);

  const layout = useMemo(() => {
    // A sequence, not a scale: the steps are spaced evenly from one end of the line to the other.
    // The whole timeline is where real time is drawn to scale.
    const usable = Math.max(width - NODE_SIZE, 0);
    const xs = times.map((_, index) => NODE_SIZE / 2 + (index / Math.max(count - 1, 1)) * usable);
    // Steps are set apart far enough to read, and to fit a count between them where events hide.
    const minGap = (index: number) =>
      (hiddenBetween[index]?.length ?? 0) > 0 ? GAP_FOR_COUNT : MIN_STEP_GAP;
    for (let i = 1; i < xs.length; i++) xs[i] = Math.max(xs[i], xs[i - 1] + minGap(i - 1));
    const maxX = width - NODE_SIZE / 2;
    if (xs.length > 0 && xs[xs.length - 1] > maxX) {
      xs[xs.length - 1] = maxX;
      for (let i = xs.length - 2; i >= 0; i--) xs[i] = Math.min(xs[i], xs[i + 1] - minGap(i));
    }
    // Steps too close for their own labels share one, so the line is not a zig-zag of text: the
    // time, the sentence of the event that matters most, and how many more are with it.
    const clusters: number[][] = [];
    xs.forEach((x, index) => {
      const last = clusters[clusters.length - 1];
      if (last && x - xs[last[last.length - 1]] < LABEL_WIDTH + 6) last.push(index);
      else clusters.push([index]);
    });
    const labelled = clusters.map((members) => {
      const lead = [...members].sort(
        (a, b) =>
          CLUSTER_PRIORITY.indexOf(events[a].kind) - CLUSTER_PRIORITY.indexOf(events[b].kind)
      )[0];
      const centre = (xs[members[0]] + xs[members[members.length - 1]]) / 2;
      return {
        members,
        lead,
        left: Math.min(Math.max(centre - LABEL_WIDTH / 2, 0), width - LABEL_WIDTH),
      };
    });
    return { xs, labelled };
  }, [times, width, count, hiddenBetween, events]);
  const { xs, labelled } = layout;

  const nodeTop = PAD;
  const lineTop = nodeTop + NODE_SIZE / 2;
  const labelTop = nodeTop + NODE_SIZE + PAD;
  const height = labelTop + LABEL_HEIGHT;

  const pill = css`
    position: absolute;
    z-index: 2;
    transform: translateX(-50%);
    height: ${HIDDEN_SIZE}px;
    min-width: ${HIDDEN_SIZE}px;
    padding: 0 5px;
    border-radius: ${HIDDEN_SIZE}px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    font-weight: ${euiTheme.font.weight.bold};
  `;

  return (
    <div
      data-test-subj="agenticInvestigationsTimelineStrip"
      css={css`
        inline-size: 100%;
        min-inline-size: 0;
      `}
    >
      <div
        ref={setContainer}
        // Always the full width of what holds it, however that lays out its children.
        css={css`
          position: relative;
          inline-size: 100%;
          block-size: ${height}px;
        `}
      >
        {/* The impact, lightly shaded around the steps inside it, with a thin line at each end. */}
        {windows.map(({ label, start, end, tone = 'danger' }) => {
          const inside = times
            .map((time, index) =>
              time >= Date.parse(start) && time <= Date.parse(end) ? index : -1
            )
            .filter((index) => index >= 0);
          if (inside.length === 0) return null;
          const from = xs[inside[0]] - NODE_SIZE / 2 - 4;
          const to = xs[inside[inside.length - 1]] + NODE_SIZE / 2 + 4;
          return (
            // What the shaded band means is said on hover, not in a legend taking room above.
            <EuiToolTip
              key={`${start}-${end}`}
              title={CUSTOMER_IMPACT}
              content={label}
              position="top"
              anchorProps={{
                css: css`
                  position: absolute;
                  top: ${nodeTop - 5}px;
                  left: ${from}px;
                  width: ${to - from}px;
                  height: ${NODE_SIZE + 10}px;
                `,
              }}
            >
              <div
                data-test-subj="agenticInvestigationsTimelineSummaryWindow"
                css={css`
                  width: 100%;
                  height: 100%;
                  background: ${euiTheme.colors[tone]};
                  background: color-mix(in srgb, ${euiTheme.colors[tone]} 7%, transparent);
                  border-inline: 1px solid ${euiTheme.colors[tone]};
                  border-inline-color: color-mix(
                    in srgb,
                    ${euiTheme.colors[tone]} 55%,
                    transparent
                  );
                `}
              />
            </EuiToolTip>
          );
        })}
        {events.slice(1).map((event, index) => (
          <div
            key={`line-${event.id}`}
            css={css`
              position: absolute;
              left: ${xs[index]}px;
              width: ${xs[index + 1] - xs[index]}px;
              top: ${lineTop - 1.5}px;
              height: 3px;
              background: ${euiTheme.colors.borderBasePlain};
            `}
          />
        ))}
        {events.slice(1).map((event, index) => {
          const hidden = hiddenBetween[index]?.length ?? 0;
          const room = xs[index + 1] - xs[index];
          const middle = (xs[index] + xs[index + 1]) / 2;
          return (
            <React.Fragment key={`between-${event.id}`}>
              {hidden > 0 && (
                <button
                  type="button"
                  onClick={() => onOpenHidden(hiddenBetween[index].map(({ id }) => id))}
                  title={i18n.translate('xpack.agenticInvestigations.timelineSummary.hiddenTitle', {
                    defaultMessage:
                      '{count, plural, one {# event is} other {# events are}} hidden here. Show them in the whole timeline.',
                    values: { count: hidden },
                  })}
                  data-test-subj="agenticInvestigationsTimelineSummaryHidden"
                  css={css`
                    ${pill}
                    left: ${middle}px;
                    /* With little room between the steps, the count goes above the line. */
                    top: ${room >= GAP_FOR_COUNT - 0.5
                      ? lineTop - HIDDEN_SIZE / 2
                      : lineTop - 26}px;
                    cursor: pointer;
                    background: ${euiTheme.colors.backgroundBaseSubdued};
                    border: 1px dashed ${euiTheme.colors.borderBaseProminent};
                    color: ${euiTheme.colors.textSubdued};
                    &:hover,
                    &:focus-visible {
                      background: ${euiTheme.colors.backgroundBasePrimary};
                      border-color: ${euiTheme.colors.primary};
                      color: ${euiTheme.colors.primaryText};
                    }
                  `}
                >
                  +{hidden}
                </button>
              )}
            </React.Fragment>
          );
        })}
        {events.map((event, index) => (
          <React.Fragment key={event.id}>
            <EuiPopover
              isOpen={Boolean(impactMap) && hoverId === event.id}
              closePopover={() => setHoverId(undefined)}
              anchorPosition="downCenter"
              panelPaddingSize="m"
              ownFocus={false}
              hasArrow
              css={css`
                position: absolute;
                z-index: 1;
                left: ${xs[index] - NODE_SIZE / 2}px;
                top: ${nodeTop}px;
                line-height: 0;
              `}
              panelProps={{
                css: css`
                  pointer-events: none;
                  inline-size: 400px;
                  max-inline-size: 90vw;
                  max-block-size: 80vh;
                  overflow: hidden;
                `,
              }}
              button={
                <button
                  type="button"
                  // Without the card, the title is all the hover there is.
                  title={impactMap ? undefined : event.title}
                  onClick={() => onOpenEvent(event.id)}
                  onMouseEnter={() => setHoverId(event.id)}
                  onMouseLeave={() => setHoverId(undefined)}
                  onFocus={() => setHoverId(event.id)}
                  onBlur={() => setHoverId(undefined)}
                  data-test-subj={`agenticInvestigationsTimelineSummaryEvent-${index}`}
                  css={css`
                    padding: 0;
                    border: none;
                    background: none;
                    cursor: pointer;
                    line-height: 0;
                  `}
                >
                  <KindDot kind={event.kind} size="s" quiet />
                </button>
              }
            >
              {impactMap && <EventHoverCard event={event} impactMap={impactMap} />}
            </EuiPopover>
          </React.Fragment>
        ))}
        {labelled.map(({ members, lead, left }) => {
          const leadEvent = events[lead];
          const first = formatTimelineClock(events[members[0]].at);
          const last = formatTimelineClock(events[members[members.length - 1]].at);
          return (
            <button
              key={`label-${leadEvent.id}`}
              type="button"
              title={impactMap ? undefined : leadEvent.title}
              onClick={() => onOpenEvent(leadEvent.id)}
              onMouseEnter={() => setHoverId(leadEvent.id)}
              onMouseLeave={() => setHoverId(undefined)}
              data-test-subj="agenticInvestigationsTimelineSummaryLabel"
              css={css`
                position: absolute;
                left: ${left}px;
                top: ${labelTop}px;
                width: ${LABEL_WIDTH}px;
                height: ${LABEL_HEIGHT - 4}px;
                padding: 0;
                border: none;
                background: none;
                cursor: pointer;
                color: inherit;
                font: inherit;
                text-align: center;
                &:hover .summaryText {
                  text-decoration: underline;
                }
              `}
            >
              <EuiText size="xs" color="subdued">
                {first === last ? first : `${first}–${last}`}
              </EuiText>
              <EuiText
                size="xs"
                className="summaryText"
                css={css`
                  white-space: nowrap;
                  overflow: hidden;
                  text-overflow: ellipsis;
                `}
              >
                {shortTextOf(leadEvent)}
                {members.length > 1 && (
                  <span css={{ color: euiTheme.colors.textSubdued }}> +{members.length - 1}</span>
                )}
              </EuiText>
            </button>
          );
        })}
      </div>
    </div>
  );
};
