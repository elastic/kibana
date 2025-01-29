/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { BucketSpan } from '../bucket_span';
import { SplitFieldSelector } from '../split_field';
import { Influencers } from '../influencers';

interface Props {
  setIsValid: (proceed: boolean) => void;
}

export const RareSettings: FC<Props> = ({ setIsValid }) => {
  return (
    <>
      <EuiFlexGroup gutterSize="xl">
        <EuiFlexItem>
          <SplitFieldSelector />
        </EuiFlexItem>
        <EuiFlexItem>
          <Influencers />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiFlexGroup gutterSize="xl">
        <EuiFlexItem>
          <BucketSpan setIsValid={setIsValid} />
        </EuiFlexItem>
        <EuiFlexItem />
      </EuiFlexGroup>
    </>
  );
};
