/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { BoostDataSource, DataStreamsBoostProfile } from '../../common/types';
import { estimateDataStreamPeriods } from '../../common/vcu_estimate';
import { DataStreamTimeline } from './data_stream_timeline';

interface AgeTimelineProps {
  profile: DataStreamsBoostProfile;
  /** The data streams the profile applies to, whose data the timeline sorts into periods. */
  dataStreams: readonly BoostDataSource[];
  /** What the timeline describes: one rule, or a profile across every rule that uses it. */
  appliesThrough: 'rule' | 'profile';
}

/**
 * A details page's timeline of a profile's periods, with how much data is in each. Until the
 * profile applies to a data stream, a caption says why the periods have no data.
 */
export const AgeTimeline = ({ profile, dataStreams, appliesThrough }: AgeTimelineProps) => {
  const estimates =
    dataStreams.length > 0 ? estimateDataStreamPeriods(profile, dataStreams) : undefined;
  const emptyCaption =
    appliesThrough === 'rule'
      ? i18n.translate('xpack.boost.ageTimeline.ruleEmptyCaption', {
          defaultMessage:
            'How much data is in each phase appears once this rule applies to a data stream.',
        })
      : i18n.translate('xpack.boost.ageTimeline.emptyCaption', {
          defaultMessage:
            'How much data is in each phase appears once a boost rule applies this profile to a data stream.',
        });

  return (
    <div data-test-subj="boostAgeTimeline">
      <DataStreamTimeline
        maxAges={{ recent: profile.recent.max_age, standard: profile.standard.max_age }}
        boosts={profile}
        estimates={estimates}
        showsCost
        background="plain"
        testSubj="boostAgeTimelinePeriods"
      />
      {!estimates && (
        <>
          <EuiSpacer size="m" />
          <EuiText size="xs" color="subdued">
            {emptyCaption}
          </EuiText>
        </>
      )}
    </div>
  );
};
