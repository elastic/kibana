/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexItem } from '@elastic/eui';
import React from 'react';
import { isEmpty } from 'lodash/fp';
import { Anomaly } from '../types';

export const createKeyAndValue = (influencer: Record<string, string>): string => {
  if (Object.keys(influencer)[0] != null && Object.values(influencer)[0] != null) {
    return `${Object.keys(influencer)[0]}: “${Object.values(influencer)[0]}”`;
  } else {
    return '';
  }
};

export const createInfluencers = (score: Anomaly): JSX.Element => {
  return (
    <>
      {score.influencers
        .filter(influencer => !isEmpty(influencer))
        .map(influencer => {
          const keyAndValue = createKeyAndValue(influencer);
          return (
            <EuiFlexItem key={keyAndValue} grow={false}>
              {keyAndValue}
            </EuiFlexItem>
          );
        })}
    </>
  );
};
