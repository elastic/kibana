/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiText, EuiSpacer, EuiFlexGroup, EuiFlexItem, EuiLink } from '@elastic/eui';
import React from 'react';
import styled from 'styled-components';
import { i18n } from '@kbn/i18n';
import { Anomaly, NarrowDateRange } from './types';
import { getScoreString } from './get_score_string';
import { createLink } from './create_link';
import { PreferenceFormattedDate } from '../formatted_date';
import { createInfluencers } from './create_influencers';
import { DescriptionList } from '../../../common/utility_types';

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
): DescriptionList[] => {
  const descriptionList: DescriptionList[] = [
    {
      title: i18n.translate('xpack.siem.ml.createDescriptionsList.maxAnomalyScoreTitle', {
        defaultMessage: 'Max Anomaly Score',
      }),
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
          {i18n.translate('xpack.siem.ml.createDescriptionsList.anomalyJobTitle', {
            defaultMessage: 'Anomaly Job',
          })}
        </>
      ),
      description: (
        <EuiFlexGroup direction="column" gutterSize="none" responsive={false}>
          <EuiFlexItem grow={false}>{score.jobId}</EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiLink href={createLink(score, startDate, endDate)} target="_blank">
              {i18n.translate('xpack.siem.ml.createDescriptionsList.viewInMachineLearningLink', {
                defaultMessage: 'View in Machine Learning',
              })}
            </EuiLink>
          </EuiFlexItem>
        </EuiFlexGroup>
      ),
    },
    {
      title: i18n.translate('xpack.siem.ml.createDescriptionsList.detectedTitle', {
        defaultMessage: 'Detected',
      }),
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
              {i18n.translate('xpack.siem.ml.createDescriptionsList.narrowToThisDateRangeLink', {
                defaultMessage: 'Narrow to this date range',
              })}
            </EuiLink>
          </EuiFlexItem>
        </EuiFlexGroup>
      ),
    },
    {
      title: i18n.translate('xpack.siem.ml.createDescriptionsList.topAnomalySuspectTitle', {
        defaultMessage: 'Top Anomaly Suspect',
      }),
      description: (
        <EuiFlexGroup direction="column" gutterSize="none" responsive={false}>
          <EuiFlexItem grow={false}>{`${score.entityName}: “${score.entityValue}”`}</EuiFlexItem>
        </EuiFlexGroup>
      ),
    },
    {
      title: i18n.translate('xpack.siem.ml.createDescriptionsList.influencedByTitle', {
        defaultMessage: 'Influenced By',
      }),
      description: (
        <EuiFlexGroup direction="column" gutterSize="none" responsive={false}>
          {createInfluencers(score)}
        </EuiFlexGroup>
      ),
    },
  ];
  return descriptionList;
};
