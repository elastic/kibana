/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexItem } from '@elastic/eui';
import React from 'react';
import { Anomaly } from './types';

export const createKeyAndValue = (influencer: Record<string, string>): string =>
  `${Object.keys(influencer)[0]}: “${Object.values(influencer)[0]}”`;

export const createInfluencers = (score: Anomaly): JSX.Element => {
  return (
    <>
      {score.influencers.map(influencer => {
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
