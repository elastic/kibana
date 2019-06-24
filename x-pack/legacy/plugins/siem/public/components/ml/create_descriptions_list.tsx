/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiText, EuiSpacer, EuiFlexGroup, EuiFlexItem, EuiLink } from '@elastic/eui';
import React, { ReactNode } from 'react';
import styled from 'styled-components';
import { Anomaly, NarrowDateRange } from './types';
import { getScoreString } from './get_score_string';
import { createLink } from './create_link';
import { PreferenceFormattedDate } from '../formatted_date';
import { createInfluencers } from './create_influencers';

type DescriptionList = Array<{
  title: NonNullable<ReactNode>;
  description: NonNullable<ReactNode>;
}>;

const LargeScore = styled(EuiText)`
  font-size: 45px;
  font-weight: lighter;
`;

export const createDescriptionsList = (
  score: Anomaly,
  startDate: number,
  endDate: number,
  interval: string,
  narrowDateRange: NarrowDateRange
): DescriptionList => {
  const descriptionList: DescriptionList = [
    {
      title: 'Max Anomaly Score', // TODO: i18n
      description: (
        <>
          <EuiSpacer size="m" />
          <LargeScore>{getScoreString(score.severity)}</LargeScore>
        </>
      ),
    },
    {
      title: (
        <>
          <EuiSpacer size="m" />
          {'Anomaly Job'}
        </>
      ),
      description: (
        <EuiFlexGroup direction="column" gutterSize="none" responsive={false}>
          <EuiFlexItem grow={false}>{score.jobId}</EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiLink href={createLink(score, startDate, endDate)} target="_blank">
              {'View in Machine Learning'}
            </EuiLink>
          </EuiFlexItem>
        </EuiFlexGroup>
      ),
    },
    {
      title: <>{'Detected'}</>,
      description: (
        <EuiFlexGroup direction="column" gutterSize="none" responsive={false}>
          <EuiFlexItem grow={false}>
            <PreferenceFormattedDate value={new Date(score.time)} />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiLink
              onClick={() => {
                narrowDateRange(score, interval);
              }}
              target="_blank"
            >
              {'Narrow to this date range'}
            </EuiLink>
          </EuiFlexItem>
        </EuiFlexGroup>
      ),
    },
    {
      title: <>{'Top Anomaly Suspect'}</>,
      description: (
        <EuiFlexGroup direction="column" gutterSize="none" responsive={false}>
          <EuiFlexItem grow={false}>{`${score.entityName}: “${score.entityValue}”`}</EuiFlexItem>
        </EuiFlexGroup>
      ),
    },
    {
      title: <>{'Influenced By'}</>,
      description: (
        <EuiFlexGroup direction="column" gutterSize="none" responsive={false}>
          {createInfluencers(score)}
        </EuiFlexGroup>
      ),
    },
  ];
  return descriptionList;
};
