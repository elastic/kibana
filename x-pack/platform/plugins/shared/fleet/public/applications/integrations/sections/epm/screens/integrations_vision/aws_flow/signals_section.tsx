/**
 * SignalsSection — the "Signals" block of Step 0 (Schema & Signals).
 *
 * Figma:
 *   3169:85586  Three signals, all available
 *   3169:87631  Two signals (Logs + Metrics), both available
 *   3169:88739  Metrics unavailable → disabled card, full description kept
 *   3169:89077  Only Metrics available → Logs disabled, canonical order KEPT
 *
 * Display rules (data-backed, adopted 09-08 — annotation 3169:88737):
 * - Logs & Metrics always render. Availability genuinely varies across the
 *   registry (74% logs-only, 8% metrics-only, 13% both), so a disabled card
 *   answers a real question at zero navigation cost.
 * - Traces renders ONLY when the integration actually has traces — 1 of 389
 *   integrations (Elastic APM itself). Traces come from APM/OTel
 *   instrumentation, not integration packages; a permanently disabled card
 *   would read as a broken promise.
 * - Canonical Logs → Metrics → Traces order everywhere, never reordered:
 *   fixed positions build spatial memory, and the checked-vs-ghost contrast
 *   already guides the eye.
 * - Disabled cards keep the FULL description — the card still teaches what
 *   the signal is; the disabled treatment alone carries availability (the
 *   "(Not available)" title suffix was dropped in the 09-08 hi-fi).
 */

import React from 'react';
import { StepSection, StepSectionHeader, StepSectionHeading, OptionsRow, StepChoiceCard } from './step_primitives';

export const CANONICAL_SIGNALS = ['Logs', 'Metrics', 'Traces'] as const;
export type Signal = (typeof CANONICAL_SIGNALS)[number];

/** Default one-sentence blurbs — override per integration via blurbFor. */
const DEFAULT_BLURBS: Record<Signal, string> = {
  Logs: 'Event records of what happened — errors, audits, and activity you can search and analyze.',
  Metrics:
    'Numeric measurements over time — usage, saturation, and request rates for dashboards and alerts.',
  Traces:
    'End-to-end request paths across services — see where time is spent and where failures start.',
};

export interface SignalsSectionProps {
  /** Signals the integration actually ships. */
  available: ReadonlyArray<Signal>;
  selected: ReadonlyArray<Signal>;
  onToggle: (signal: Signal) => void;
  /** Integration-specific copy override (e.g. Okta's System Log sentence). */
  blurbFor?: (signal: Signal) => string | undefined;
}

export const SignalsSection = ({
  available,
  selected,
  onToggle,
  blurbFor,
}: SignalsSectionProps): React.ReactElement => {
  // Logs & Metrics always render; Traces only when real (rule above).
  const visibleSignals = CANONICAL_SIGNALS.filter(
    (signal) => signal !== 'Traces' || available.includes('Traces')
  );

  return (
    <StepSection>
      {/* Description dropped 09-15 (user call) — the cards are self-explanatory. */}
      <StepSectionHeader>
        <StepSectionHeading>Signals</StepSectionHeading>
      </StepSectionHeader>
      <OptionsRow>
        {visibleSignals.map((signal) => {
          const isAvailable = available.includes(signal);
          return (
            <StepChoiceCard
              key={signal}
              id={`signal-${signal.toLowerCase()}`}
              control="checkbox"
              name={`signal-${signal.toLowerCase()}`}
              title={signal}
              description={blurbFor?.(signal) ?? DEFAULT_BLURBS[signal]}
              checked={isAvailable && selected.includes(signal)}
              disabled={!isAvailable}
              onChange={() => onToggle(signal)}
            />
          );
        })}
      </OptionsRow>
    </StepSection>
  );
};
