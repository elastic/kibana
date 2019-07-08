/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiText, EuiSpacer, EuiFlexGroup, EuiFlexItem, EuiLink } from '@elastic/eui';
import React from 'react';
import styled from 'styled-components';
import { Anomaly, NarrowDateRange } from '../types';
import { getScoreString } from './get_score_string';
import { PreferenceFormattedDate } from '../../formatted_date';
import { createInfluencers } from './../influencers/create_influencers';
import { DescriptionList } from '../../../../common/utility_types';
import * as i18n from './translations';
import { createExplorerLink } from '../links/create_explorer_link';

const LargeScore = styled(EuiText)`
  font-size: 45px;
  font-weight: lighter;
`;

export const createDescriptionList = (
  score: Anomaly,
  startDate: number,
  endDate: number,
  interval: string,
  narrowDateRange: NarrowDateRange
): DescriptionList[] => {
  const descriptionList: DescriptionList[] = [
    {
      title: i18n.MAX_ANOMALY_SCORE,
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
          {i18n.ANOMALY_JOB}
        </>
      ),
      description: (
        <EuiFlexGroup direction="column" gutterSize="none" responsive={false}>
          <EuiFlexItem grow={false}>{score.jobId}</EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiLink href={createExplorerLink(score, startDate, endDate)} target="_blank">
              {i18n.VIEW_IN_MACHINE_LEARNING}
            </EuiLink>
          </EuiFlexItem>
        </EuiFlexGroup>
      ),
    },
    {
      title: i18n.DETECTED,
      description: (
        <EuiFlexGroup direction="column" gutterSize="none" responsive={false}>
          <EuiFlexItem grow={false}>
            <PreferenceFormattedDate value={new Date(score.time)} />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiLink
              data-test-subj="anomaly-description-narrow-range-link"
              onClick={() => {
                narrowDateRange(score, interval);
              }}
              target="_blank"
            >
              {i18n.NARROW_TO_THIS_DATE_RANGE}
            </EuiLink>
          </EuiFlexItem>
        </EuiFlexGroup>
      ),
    },
    {
      title: i18n.TOP_ANOMALY_SUSPECT,
      description: (
        <EuiFlexGroup direction="column" gutterSize="none" responsive={false}>
          <EuiFlexItem grow={false}>{`${score.entityName}: "${score.entityValue}"`}</EuiFlexItem>
        </EuiFlexGroup>
      ),
    },
    {
      title: i18n.INFLUENCED_BY,
      description: (
        <EuiFlexGroup direction="column" gutterSize="none" responsive={false}>
          {createInfluencers(score)}
        </EuiFlexGroup>
      ),
    },
  ];
  return descriptionList;
};
