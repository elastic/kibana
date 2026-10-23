/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiText,
  EuiToolTip,
  colorPalette,
  hexToRgb,
  isColorDark,
  makeHighContrastColor,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type {
  DataStreamPeriod,
  DataStreamPeriodEstimates,
  VcuRange,
} from '../../common/vcu_estimate';
import { parseMaxAge, toMaxAgeHours } from '../../common/validation';
import { formatCostRange, formatSize, getVcuRangeText } from './cost_format';
import { PERIOD_LABELS } from './profiles/period_labels';

interface DataStreamTimelineProps {
  /** The max ages that end the recent and standard periods. */
  maxAges: { recent?: string; standard?: string };
  /** Each period's data and search VCUs; omitted while no data streams use the periods. */
  estimates?: DataStreamPeriodEstimates;
  /** Whether hovering or focusing a period shows its search cost per hour and VCUs. */
  showsCost?: boolean;
  /**
   * The background the timeline sits on, which its track is two shades darker than: a plain one,
   * such as a panel's, or a subdued one, such as a flyout footer's.
   */
  background?: 'plain' | 'subdued';
  /** Prefixes the test subjects of the timeline and each period. */
  testSubj: string;
}

const PERIODS: readonly DataStreamPeriod[] = ['recent', 'standard', 'background'];

/** A period's search cost per hour and VCUs, for its tooltip. */
const PeriodCost = ({ vcus }: { vcus: VcuRange }) => (
  <>
    <div>{formatCostRange(vcus)}</div>
    <div>{getVcuRangeText(vcus)}</div>
  </>
);

const toHours = (maxAge: string | undefined) => {
  const parsed = parseMaxAge(maxAge);
  return parsed ? toMaxAgeHours(parsed) : 0;
};

/**
 * A shade of the assistance color for each period, strongest for the newest data, with text that
 * contrasts with it. They avoid the lifecycle phase colors, whose hot to frozen meanings don't apply.
 * The lightest step of the blend is left out, since it barely stands out from the timeline's track.
 */
export const usePeriodColors = (): Record<
  DataStreamPeriod,
  { background: string; text: string }
> => {
  const { euiTheme } = useEuiTheme();
  return useMemo(() => {
    const [, background, standard, recent] = colorPalette(
      [euiTheme.colors.backgroundLightAssistance, euiTheme.colors.backgroundFilledAssistance],
      4
    );
    const withText = (color: string) => {
      const [red, green, blue] = hexToRgb(color);
      const text = isColorDark(red, green, blue)
        ? euiTheme.colors.plainLight
        : euiTheme.colors.plainDark;
      return { background: color, text: makeHighContrastColor(text)(color) };
    };
    return {
      recent: withText(recent),
      standard: withText(standard),
      background: withText(background),
    };
  }, [euiTheme]);
};

/**
 * A data streams profile's periods along the age of data, like the Streams lifecycle timeline: each
 * period's name and data in its bar, optionally with its search cost in a tooltip, and the ages
 * between them below.
 * Recent and Standard are as long as their max ages allow, and a Standard period that ends where
 * Recent does is left out. Background has no end, so it gets the length of the period before it.
 * Each keeps a minimum width, so its text doesn't truncate too soon.
 */
export const DataStreamTimeline = ({
  maxAges,
  estimates,
  showsCost = false,
  background = 'subdued',
  testSubj,
}: DataStreamTimelineProps) => {
  const { euiTheme } = useEuiTheme();
  const colors = usePeriodColors();
  const recentHours = toHours(maxAges.recent);
  const standardHours = Math.max(toHours(maxAges.standard) - recentHours, 0);
  const weights: Record<DataStreamPeriod, number> = {
    recent: recentHours,
    standard: standardHours,
    background: standardHours > 0 ? standardHours : recentHours,
  };
  const periods = PERIODS.filter((period) => weights[period] > 0);
  // Each period is as long as its share of the timeline, but no narrower than its text needs.
  const proportionalColumns = periods
    .map((period) => `minmax(${euiTheme.base * 6.5}px, ${weights[period]}fr)`)
    .join(' ');
  const tickLabels: Record<DataStreamPeriod, string | undefined> = {
    recent: '0',
    standard: maxAges.recent,
    background: maxAges.standard,
  };

  const lineCss = {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  } as const;

  return (
    // The timeline sizes to its own width, such as a narrow panel on a phone, not the viewport's.
    <div css={{ containerType: 'inline-size' }} data-test-subj={testSubj}>
      <div
        css={{
          // The bars and the ticks below share these columns, so each tick lines up with the gap
          // between two bars.
          '--boostPeriodColumns': proportionalColumns,
          '--boostPeriodPadding': euiTheme.size.s,
          // When narrow, the periods share the width equally and pad less, so their text fits; the
          // ticks still say where each one starts.
          [`@container (max-width: ${euiTheme.base * 22.5}px)`]: {
            '--boostPeriodColumns': `repeat(${periods.length}, minmax(${
              euiTheme.base * 4.5
            }px, 1fr))`,
            '--boostPeriodPadding': euiTheme.size.xs,
          },
          // Narrower still, the timeline scrolls rather than squeezing them further. The scroll area
          // reaches past the timeline's ends, so the first and last ages can center on their ticks.
          overflowX: 'auto',
          paddingInline: euiTheme.size.s,
          marginInline: `-${euiTheme.size.s}`,
        }}
      >
        <div
          role="list"
          aria-label={i18n.translate('xpack.boost.dataStreamTimeline.label', {
            defaultMessage: 'Boost phases by age of data',
          })}
          css={{
            display: 'grid',
            gridTemplateColumns: 'var(--boostPeriodColumns)',
            padding: `${euiTheme.size.xs} ${euiTheme.size.xxs}`,
            // EUI has no background color two shades darker than a subdued one, only this border
            // color.
            backgroundColor:
              background === 'plain'
                ? euiTheme.colors.lightestShade
                : euiTheme.colors.borderBaseSubdued,
            borderRadius: euiTheme.border.radius.panel,
          }}
        >
          {periods.map((period) => {
            const estimate = estimates?.[period];
            const size = estimate ? formatSize(estimate.sizeInBytes) : '—';
            const cost = showsCost ? estimate?.vcus : undefined;
            const bar = (
              <div
                // Focusable when it has a tooltip, so keyboard users can reach its cost too.
                tabIndex={cost ? 0 : undefined}
                css={{
                  padding: `${euiTheme.size.s} var(--boostPeriodPadding)`,
                  borderRadius: euiTheme.border.radius.control,
                  backgroundColor: colors[period].background,
                  color: colors[period].text,
                }}
              >
                <EuiText size="xs" color="inherit">
                  <div
                    css={[lineCss, { fontWeight: euiTheme.font.weight.medium }]}
                    title={PERIOD_LABELS[period].title}
                  >
                    {PERIOD_LABELS[period].title}
                  </div>
                  <div css={lineCss} title={size}>
                    {size}
                  </div>
                </EuiText>
              </div>
            );
            return (
              <div
                key={period}
                role="listitem"
                css={{ paddingInline: euiTheme.size.xxs, minInlineSize: 0 }}
                data-test-subj={`${testSubj}-${period}`}
              >
                {cost ? (
                  <EuiToolTip
                    title={PERIOD_LABELS[period].title}
                    content={<PeriodCost vcus={cost} />}
                    display="block"
                  >
                    {bar}
                  </EuiToolTip>
                ) : (
                  bar
                )}
              </div>
            );
          })}
        </div>
        {/* The ages where each period starts, which the bars' text already covers for screen
          readers. */}
        <div
          aria-hidden={true}
          css={{
            display: 'grid',
            gridTemplateColumns: 'var(--boostPeriodColumns)',
            paddingInline: euiTheme.size.xxs,
            marginBlockStart: euiTheme.size.xs,
          }}
        >
          {periods.map((period) => (
            <div key={period}>
              <div
                css={{
                  blockSize: euiTheme.size.s,
                  borderInlineStart: `${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBasePlain}`,
                }}
              />
              <EuiText
                size="xs"
                color="subdued"
                // Each age sits centered under its tick.
                css={{ display: 'inline-block', transform: 'translateX(-50%)' }}
              >
                {tickLabels[period]}
              </EuiText>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
