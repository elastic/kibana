/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiIcon, EuiText, EuiToolTip, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { GanttEpisode } from '../../../../utils/derive_gantt_data';

const BAR_HEIGHT_PX = 8;
const END_DOT_OFFSET_PX = 2;

const pct = (n: number) => `${n}%`;

const positionPercent = (firstMs: number, lastMs: number, gteMs: number, lteMs: number) => {
  const span = lteMs - gteMs;
  const left = ((firstMs - gteMs) / span) * 100;
  const width = Math.max(0, ((lastMs - firstMs) / span) * 100);
  return { left, width };
};

export interface GanttBarProps {
  episode: GanttEpisode;
  gteMs: number;
  lteMs: number;
  /** When the bar fires onClick (e.g. navigate to episode details). */
  onClick?: (episode: GanttEpisode) => void;
}

const formatTimestamp = (ms: number) => new Date(ms).toLocaleString();

const formatDuration = (ms: number) => {
  if (!Number.isFinite(ms) || ms <= 0) return '0m';
  const totalMinutes = Math.round(ms / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
};

/**
 * One episode rendered as a positioned pill on the Gantt track. Recovered
 * episodes get a solid teal fill plus an end-cap dot at the recovery time;
 * open episodes fade to transparent at their right edge with a ringed live
 * dot. Hover for an EuiToolTip with start/end/duration.
 */
export const GanttBar: React.FC<GanttBarProps> = ({ episode, gteMs, lteMs, onClick }) => {
  const { euiTheme } = useEuiTheme();
  const { left, width } = positionPercent(episode.firstMs, episode.lastMs, gteMs, lteMs);

  const fill = episode.isOpen
    ? `linear-gradient(to right, ${euiTheme.colors.danger} 60%, transparent)`
    : euiTheme.colors.success;

  const tooltip = (
    <EuiText size="xs">
      <div>
        <strong>
          {episode.isOpen
            ? i18n.translate('xpack.alertingV2.ruleDetails.gantt.tooltipOpen', {
                defaultMessage: 'Open episode',
              })
            : i18n.translate('xpack.alertingV2.ruleDetails.gantt.tooltipRecovered', {
                defaultMessage: 'Recovered episode',
              })}
        </strong>
      </div>
      <div>
        {i18n.translate('xpack.alertingV2.ruleDetails.gantt.tooltipStart', {
          defaultMessage: 'Started: {when}',
          values: { when: formatTimestamp(episode.firstMs) },
        })}
      </div>
      <div>
        {episode.isOpen
          ? i18n.translate('xpack.alertingV2.ruleDetails.gantt.tooltipLastEvent', {
              defaultMessage: 'Last event: {when}',
              values: { when: formatTimestamp(episode.lastMs) },
            })
          : i18n.translate('xpack.alertingV2.ruleDetails.gantt.tooltipRecoveredAt', {
              defaultMessage: 'Recovered: {when}',
              values: { when: formatTimestamp(episode.lastMs) },
            })}
      </div>
      <div>
        {i18n.translate('xpack.alertingV2.ruleDetails.gantt.tooltipDuration', {
          defaultMessage: 'Duration: {duration}',
          values: { duration: formatDuration(episode.durationMs) },
        })}
      </div>
    </EuiText>
  );

  const liveDotRingColor = `${euiTheme.colors.danger}33`; // ~20% alpha hex

  return (
    <EuiToolTip content={tooltip} position="top" disableScreenReaderOutput>
      <button
        type="button"
        onClick={onClick ? () => onClick(episode) : undefined}
        aria-label={i18n.translate('xpack.alertingV2.ruleDetails.gantt.barAriaLabel', {
          defaultMessage: '{state} episode starting {when}',
          values: {
            state: episode.isOpen ? 'Open' : 'Recovered',
            when: formatTimestamp(episode.firstMs),
          },
        })}
        css={css`
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          height: ${BAR_HEIGHT_PX}px;
          min-width: ${euiTheme.size.s};
          border: 0;
          padding: 0;
          margin: 0;
          background: ${fill};
          border-radius: 9999px;
          cursor: ${onClick ? 'pointer' : 'default'};

          &:focus-visible {
            outline: 2px solid ${euiTheme.colors.primary};
            outline-offset: 2px;
          }
        `}
        style={{ left: pct(left), width: pct(width) }}
        data-test-subj={episode.isOpen ? 'ganttBarOpen' : 'ganttBarRecovered'}
      >
        <span
          aria-hidden
          css={css`
            position: absolute;
            top: 50%;
            right: -${END_DOT_OFFSET_PX}px;
            transform: translateY(-50%);
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: ${euiTheme.size.base};
            height: ${euiTheme.size.base};
            // border-radius: 9999px;
            ${episode.isOpen ? `box-shadow: 0 0 0 2px ${liveDotRingColor};` : ''}
          `}
        >
          <EuiIcon
            type="dot"
            color={episode.isOpen ? euiTheme.colors.danger : euiTheme.colors.success}
            size="s"
          />
        </span>
      </button>
    </EuiToolTip>
  );
};
