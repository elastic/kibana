/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiPopover, EuiTextTruncate, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { AGENT_BUILDER_UI_EBT } from '@kbn/agent-builder-common';
import type { ConversationRound } from '@kbn/agent-builder-common';
import { getEbtProps } from '@kbn/ebt-click';
import React, { useEffect, useRef, useState } from 'react';
import { useExperimentalFeatures } from '../../../hooks/use_experimental_features';

const CONVERSATION_ROUNDS_ID = 'agentBuilderConversationRoundsContainer';
const MAX_VISIBLE_PIPS = 10;
const HIDE_GRACE_MS = 150;
const PIP_WIDTH = 16;
const PIP_HEIGHT = 4;
const POPOUT_WIDTH = 360;
const DISTANCE_FROM_BOTTOM_THRESHOLD = 50;

const containerLabel = i18n.translate('xpack.agentBuilder.roundPips.containerLabel', {
  defaultMessage: 'Recent rounds',
});

interface RoundPipsProps {
  scrollContainer: HTMLDivElement | null;
  rounds: ConversationRound[];
}

export const RoundPips: React.FC<RoundPipsProps> = ({ scrollContainer, rounds }) => {
  const experimentalEnabled = useExperimentalFeatures();
  const { euiTheme } = useEuiTheme();

  const [topmostIndex, setTopmostIndex] = useState(0);
  const [open, setOpen] = useState(false);

  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>();

  // Track which round is currently focused
  useEffect(() => {
    if (!scrollContainer || rounds.length === 0) return;

    const compute = () => {
      const roundsContainer = scrollContainer.querySelector(`[id="${CONVERSATION_ROUNDS_ID}"]`);
      if (!roundsContainer) return;
      const children = roundsContainer.children;
      if (children.length === 0) return;

      const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
      if (scrollHeight - (scrollTop + clientHeight) <= DISTANCE_FROM_BOTTOM_THRESHOLD) {
        setTopmostIndex(children.length - 1);
        return;
      }

      const containerTop = scrollContainer.getBoundingClientRect().top;
      for (let i = 0; i < children.length; i++) {
        const rect = (children[i] as HTMLElement).getBoundingClientRect();
        if (rect.bottom > containerTop) {
          setTopmostIndex(i);
          return;
        }
      }
      setTopmostIndex(children.length - 1);
    };

    compute();
    scrollContainer.addEventListener('scroll', compute);
    return () => scrollContainer.removeEventListener('scroll', compute);
  }, [scrollContainer, rounds.length]);

  const recentRounds = rounds.slice(-MAX_VISIBLE_PIPS);
  const recentStartIndex = rounds.length - recentRounds.length;
  const activeIndexInRecent =
    topmostIndex >= recentStartIndex ? topmostIndex - recentStartIndex : -1;
  const isDisabled = rounds.length > MAX_VISIBLE_PIPS && activeIndexInRecent < 0;

  const cancelHide = () => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
  };
  const scheduleHide = () => {
    cancelHide();
    hideTimerRef.current = setTimeout(() => setOpen(false), HIDE_GRACE_MS);
  };
  const handleEnter = () => {
    if (isDisabled) return;
    cancelHide();
    setOpen(true);
  };
  const handleSelect = (roundIndex: number) => {
    setOpen(false);
    const el = scrollContainer?.querySelector(`[id="${CONVERSATION_ROUNDS_ID}"]`)?.children[
      roundIndex
    ] as HTMLElement | undefined;
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (!experimentalEnabled || recentRounds.length === 0) {
    return null;
  }

  const wrapperStyles = css`
    position: absolute;
    right: 0;
    top: 50%;
    transform: translateY(-50%);
    z-index: 2;
  `;

  const stripStyles = css`
    padding: ${euiTheme.size.m};
    pointer-events: ${isDisabled ? 'none' : 'auto'};
  `;

  const pipStyleFor = (active: boolean) => css`
    width: ${PIP_WIDTH}px;
    height: ${PIP_HEIGHT}px;
    border-radius: ${PIP_WIDTH}px;
    background: ${isDisabled
      ? euiTheme.colors.textDisabled
      : active
      ? euiTheme.colors.backgroundFilledText
      : euiTheme.colors.backgroundLightText};
  `;

  const popoutStyles = css`
    width: ${POPOUT_WIDTH}px;
  `;

  const rowStyles = (active: boolean) => css`
    display: block;
    width: 100%;
    text-align: left;
    background: ${active ? euiTheme.colors.backgroundLightPrimary : 'transparent'};
    color: ${euiTheme.colors.textParagraph};
    border: none;
    border-radius: ${euiTheme.border.radius.small};
    padding: ${euiTheme.size.xs} ${euiTheme.size.s};
    cursor: pointer;
    min-width: 0;

    &:hover {
      background-color: ${euiTheme.colors.backgroundLightPrimary};
    }
  `;

  const pipStrip = (
    <EuiFlexGroup
      direction="column"
      gutterSize="xs"
      responsive={false}
      alignItems="center"
      css={stripStyles}
      onMouseEnter={handleEnter}
      onMouseLeave={scheduleHide}
      aria-label={containerLabel}
      aria-disabled={isDisabled || undefined}
      data-test-subj="agentBuilderRoundPipsStrip"
    >
      {recentRounds.map((_round, i) => (
        <div
          key={`pip-${recentStartIndex + i}`}
          css={pipStyleFor(i === activeIndexInRecent)}
          aria-hidden
        />
      ))}
    </EuiFlexGroup>
  );

  return (
    <div css={wrapperStyles}>
      <EuiPopover
        button={pipStrip}
        isOpen={open && !isDisabled}
        closePopover={() => setOpen(false)}
        anchorPosition="leftCenter"
        hasArrow={false}
        ownFocus={false}
        panelPaddingSize="s"
        aria-label={containerLabel}
        panelProps={{
          onMouseEnter: cancelHide,
          onMouseLeave: scheduleHide,
          'data-test-subj': 'agentBuilderRoundPipsPopout',
        }}
      >
        <EuiFlexGroup direction="column" gutterSize="xs" responsive={false} css={popoutStyles}>
          {recentRounds.map((round, i) => {
            const message = round.input?.message ?? '';
            const isActive = i === activeIndexInRecent;
            return (
              <EuiFlexItem grow={false} key={`row-${recentStartIndex + i}`}>
                <button
                  type="button"
                  css={rowStyles(isActive)}
                  onClick={() => handleSelect(recentStartIndex + i)}
                  aria-label={message}
                  {...getEbtProps({
                    element: AGENT_BUILDER_UI_EBT.element.pageContent,
                    action: AGENT_BUILDER_UI_EBT.action.conversation.ROUND_PIP_NAVIGATE,
                  })}
                >
                  <EuiTextTruncate text={message} />
                </button>
              </EuiFlexItem>
            );
          })}
        </EuiFlexGroup>
      </EuiPopover>
    </div>
  );
};
