/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiButton, EuiFlexGroup, EuiFlexItem, EuiText, useEuiTheme } from '@elastic/eui';
import { css, keyframes } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import React, { useEffect, useRef, useState } from 'react';

type TextColor = 'blue' | 'green' | 'pink';

// Terminal syntax highlight colors — intentional non-EUI values for CLI aesthetics
const SEGMENT_COLORS: Record<TextColor, string> = {
  blue: '#61a2ff',
  green: '#24c292',
  pink: '#ee72a6',
};

interface TextSegment {
  text: string;
  color?: TextColor;
}

type TerminalEntry = TextSegment[] | null; // null = blank line

interface SequenceStep {
  delay: number;
  entry?: TextSegment[] | null;
  complete?: boolean;
}

// 18-second animation sequence — delays in ms
const SEQUENCE: SequenceStep[] = [
  { delay: 0, entry: [{ text: 'Start reasoning and analysis ...' }] },
  { delay: 1800, entry: null },
  {
    delay: 2000,
    entry: [{ text: 'Calling tool: ' }, { text: 'stream.detection.insights', color: 'blue' }],
  },
  {
    delay: 2800,
    entry: [
      { text: 'Tool ' },
      { text: 'stream.detection.insights', color: 'blue' },
      { text: ' returned response: ' },
      { text: 'SUCCESS', color: 'green' },
      { text: ' stream found' },
    ],
  },
  {
    delay: 3800,
    entry: [{ text: 'Analyzing ' }, { text: 'logs.ecs', color: 'pink' }, { text: ' ...' }],
  },
  { delay: 4800, entry: null },
  {
    delay: 5200,
    entry: [{ text: 'Calling tool: ' }, { text: 'feature.extraction.insights', color: 'blue' }],
  },
  { delay: 6000, entry: [{ text: 'Identify the most relevant source' }] },
  {
    delay: 7000,
    entry: [
      { text: 'Tool ' },
      { text: 'feature.extraction.insights', color: 'blue' },
      { text: ' returned response: ' },
      { text: 'SUCCESS', color: 'green' },
      { text: ' 55 features' },
    ],
  },
  { delay: 8000, entry: null },
  {
    delay: 8400,
    entry: [{ text: 'Calling tool: ' }, { text: 'query.generation.insights', color: 'blue' }],
  },
  { delay: 9200, entry: [{ text: 'Identify the most relevant source' }] },
  {
    delay: 10500,
    entry: [
      { text: 'Tool ' },
      { text: 'query.generation.insights', color: 'blue' },
      { text: ' returned response: ' },
      { text: 'SUCCESS', color: 'green' },
      { text: ' 124 queries' },
    ],
  },
  { delay: 11500, entry: null },
  {
    delay: 12000,
    entry: [{ text: 'Calling tool: ' }, { text: 'insight.scheduler.setup', color: 'blue' }],
  },
  {
    delay: 13500,
    entry: [
      { text: 'Tool ' },
      { text: 'insight.scheduler.setup', color: 'blue' },
      { text: ' returned response: ' },
      { text: 'SUCCESS', color: 'green' },
      { text: ' 8h, 8h & 15 minutes,' },
    ],
  },
  { delay: 15000, entry: null },
  {
    delay: 15500,
    entry: [
      { text: 'Successfully', color: 'green' },
      {
        text: ' ran job, you can now enable rules and start listening for Significant events',
      },
    ],
  },
  { delay: 17500, complete: true },
];

const blinkCursor = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
`;

const terminalFontStyle = css`
  font-family: 'Roboto Mono', 'Courier New', monospace;
  font-size: 12.6px;
  line-height: 20px;
  color: white;
`;

interface AiOnboardingPanelProps {
  onStartListening?: () => void;
}

/**
 * Inner content for the CLI loading state.
 * The parent (SignificantEventsPage) owns the card wrapper, separator, and footer
 * so that both idle and loading states share the exact same card container.
 */
export function AiOnboardingPanel({ onStartListening }: AiOnboardingPanelProps) {
  const { euiTheme } = useEuiTheme();
  const [entries, setEntries] = useState<TerminalEntry[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (const step of SEQUENCE) {
      const timer = setTimeout(() => {
        if (step.complete) {
          setIsComplete(true);
        } else {
          setEntries((prev) => [...prev, step.entry ?? null]);
        }
      }, step.delay);
      timers.push(timer);
    }
    return () => timers.forEach(clearTimeout);
  }, []);

  // Keep the latest lines in view as new content arrives during loading
  useEffect(() => {
    if (!isComplete && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries, isComplete]);

  const renderEntries = (terminalEntries: TerminalEntry[]) =>
    terminalEntries.map((entry, i) => (
      <div
        key={i}
        css={css`
          min-height: 20px;
        `}
      >
        {entry !== null &&
          entry.map((seg, j) => (
            <span key={j} style={seg.color ? { color: SEGMENT_COLORS[seg.color] } : undefined}>
              {seg.text}
            </span>
          ))}
      </div>
    ));

  return (
    <>
      {/* Panel subtitle */}
      <EuiText size="s">
        <p>
          {i18n.translate('xpack.streams.significantEvents.onboarding.panelTitle', {
            defaultMessage: 'Using Elastic Agent to setup your Significant events',
          })}
        </p>
      </EuiText>

      {/*
       * Terminal box — dark background, flex-1 fills remaining card height, min-height 300px.
       * Loading state: scrollable, text grows top-down, whitespace-pre.
       * Complete state: overflow-clip, fixed 282px inner container, text bottom-aligned, whitespace-pre-wrap.
       */}
      <div
        css={[
          css`
            background: #2b394f;
            border: 1px solid ${euiTheme.colors.borderBaseSubdued};
            border-radius: 8px;
            padding: 12px;
            flex: 1;
            min-height: 300px;
          `,
          isComplete &&
            css`
              overflow: hidden;
            `,
        ]}
      >
        {isComplete ? (
          // Complete: fixed 282px container, text bottom-aligned (last lines visible)
          <div
            css={[
              terminalFontStyle,
              css`
                height: 282px;
                display: flex;
                flex-direction: column;
                justify-content: flex-end;
                white-space: pre-wrap;
              `,
            ]}
          >
            {renderEntries(entries)}
          </div>
        ) : (
          // Loading: hidden-scrollbar scrollable container, text grows from top
          <div
            ref={scrollRef}
            css={[
              terminalFontStyle,
              css`
                height: 100%;
                overflow-y: scroll;
                scrollbar-width: none;
                &::-webkit-scrollbar {
                  display: none;
                }
                white-space: pre;
              `,
            ]}
          >
            {renderEntries(entries)}
            {entries.length > 0 && (
              <span
                css={css`
                  display: inline-block;
                  width: 7px;
                  height: 13px;
                  background: white;
                  margin-left: 1px;
                  vertical-align: text-bottom;
                  animation: ${blinkCursor} 1s step-end infinite;
                `}
              />
            )}
          </div>
        )}
      </div>

      {/* Status bar — badge + contextual text on the left, action button(s) on the right */}
      <div
        css={css`
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          gap: ${euiTheme.size.s};
        `}
      >
        {/* Left: beta badge + status message */}
        <EuiFlexGroup gutterSize="xs" alignItems="flexStart" responsive={false} wrap={false}>
          <EuiFlexItem grow={false}>
            <EuiBadge color="accent">
              {i18n.translate('xpack.streams.significantEvents.onboarding.betaBadge', {
                defaultMessage: 'Beta',
              })}
            </EuiBadge>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="s">
              <p>
                {isComplete
                  ? i18n.translate(
                      'xpack.streams.significantEvents.onboarding.completeStatusText',
                      {
                        defaultMessage:
                          '1,293 Knowledge indicators were generated. Start discovering Significant events.',
                      }
                    )
                  : i18n.translate('xpack.streams.significantEvents.onboarding.loadingStatusText', {
                      defaultMessage:
                        'Analyse, configure and start understanding your data better and faster.',
                    })}
              </p>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>

        {/* Right: loading while animating, "Start discovering" once done */}
        {isComplete ? (
          <EuiButton
            size="s"
            onClick={onStartListening}
            data-test-subj="streamsSignificantEventsStartListeningButton"
          >
            {i18n.translate('xpack.streams.significantEvents.onboarding.startListeningButton', {
              defaultMessage: 'Start discovering',
            })}
          </EuiButton>
        ) : (
          <EuiButton size="s" isLoading isDisabled>
            {i18n.translate('xpack.streams.significantEvents.onboarding.preparingStatusText', {
              defaultMessage: 'Preparing your setup ...',
            })}
          </EuiButton>
        )}
      </div>
    </>
  );
}
