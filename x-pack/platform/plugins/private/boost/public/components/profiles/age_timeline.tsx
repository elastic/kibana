/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { DataStreamPeriod } from '../../../common/vcu_estimate';
import { getDataStreamPeriodSizes } from '../../../common/vcu_estimate';
import type { BoostDataSource, DataStreamsBoostProfile } from '../../../common/types';
import { parseMaxAge, toMaxAgeHours } from '../../../common/validation';
import { formatSize } from '../cost_estimate';
import { formatDataSourceCount, formatMaxAge } from '../format';
import { PERIOD_LABELS } from './period_labels';

interface AgeTimelineProps {
  profile: DataStreamsBoostProfile;
  /** The data streams the profile applies to, whose data the timeline sorts into periods. */
  dataStreams: readonly BoostDataSource[];
}

const toHours = (maxAge: string | undefined) => {
  const parsed = parseMaxAge(maxAge);
  return parsed ? toMaxAgeHours(parsed) : 0;
};

/**
 * The profile's periods along data's age, with how much of its data streams' data is in each.
 * Recent and Standard are as long as their max ages allow; Background has no end, so it gets the
 * same length as Standard. Each also keeps a minimum width, so its labels fit.
 */
export const AgeTimeline = ({ profile, dataStreams }: AgeTimelineProps) => {
  const { euiTheme } = useEuiTheme();
  const recentHours = toHours(profile.recent.max_age);
  const standardHours = Math.max(toHours(profile.standard.max_age) - recentHours, 0);
  const recentAge = formatMaxAge(profile.recent.max_age);
  const standardAge = formatMaxAge(profile.standard.max_age);
  const sizes = getDataStreamPeriodSizes(profile, dataStreams);
  const hasData = dataStreams.length > 0;

  const periods: ReadonlyArray<{
    id: DataStreamPeriod;
    weight: number;
    span: string;
    color: string;
  }> = [
    {
      id: 'recent',
      weight: recentHours,
      span: i18n.translate('xpack.boost.ageTimeline.recentSpan', {
        defaultMessage: 'Up to {age} old',
        values: { age: recentAge },
      }),
      color: euiTheme.colors.vis.euiColorVis0,
    },
    {
      id: 'standard',
      weight: standardHours,
      span: i18n.translate('xpack.boost.ageTimeline.standardSpan', {
        defaultMessage: '{from} to {to} old',
        values: { from: recentAge, to: standardAge },
      }),
      color: euiTheme.colors.vis.euiColorVis1,
    },
    {
      id: 'background',
      weight: standardHours,
      span: i18n.translate('xpack.boost.ageTimeline.backgroundSpan', {
        defaultMessage: 'Older than {age}',
        values: { age: standardAge },
      }),
      color: euiTheme.colors.vis.euiColorVis2,
    },
  ];

  return (
    <div data-test-subj="boostAgeTimeline">
      <EuiFlexGroup gutterSize="xs" responsive={false}>
        {periods.map(({ id, weight, span, color }) => (
          <EuiFlexItem
            key={id}
            css={{ flexGrow: weight, flexBasis: 0, minInlineSize: euiTheme.base * 8 }}
            data-test-subj={`boostAgeTimeline-${id}`}
          >
            <div
              css={{
                blockSize: euiTheme.size.s,
                borderRadius: euiTheme.border.radius.small,
                backgroundColor: color,
              }}
            />
            <EuiSpacer size="s" />
            <EuiText size="xs">
              <strong>{PERIOD_LABELS[id].title}</strong>
            </EuiText>
            <EuiText size="xs" color="subdued">
              {span}
            </EuiText>
            <EuiText size="s">
              {/* Without data streams, there's nothing to measure, so no row of zeros. */}
              {hasData ? formatSize(sizes[id]) : '—'}
            </EuiText>
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <EuiText size="xs" color="subdued">
        {hasData
          ? i18n.translate('xpack.boost.ageTimeline.caption', {
              defaultMessage:
                'Data in each period across the {dataStreams} this profile applies to, {size} in total.',
              values: {
                dataStreams: formatDataSourceCount('data_streams', dataStreams.length),
                size: formatSize(sizes.recent + sizes.standard + sizes.background),
              },
            })
          : i18n.translate('xpack.boost.ageTimeline.emptyCaption', {
              defaultMessage:
                'How much data is in each period appears once a boost rule applies this profile to a data stream.',
            })}
      </EuiText>
    </div>
  );
};
