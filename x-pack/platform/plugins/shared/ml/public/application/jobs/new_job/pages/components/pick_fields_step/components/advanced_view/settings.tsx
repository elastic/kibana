/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { Fragment } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { BucketSpan } from '../bucket_span';
import { Influencers } from '../influencers';
import { ModelMemoryLimitInput } from '../../../common/model_memory_limit';

interface Props {
  setIsValid: (proceed: boolean) => void;
}

export const AdvancedSettings: FC<Props> = ({ setIsValid }) => {
  return (
    <Fragment>
      <EuiFlexGroup gutterSize="xl">
        <EuiFlexItem>
          <BucketSpan setIsValid={setIsValid} />
        </EuiFlexItem>
        <EuiFlexItem>
          <Influencers />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiFlexGroup gutterSize="xl">
        <EuiFlexItem>
          <ModelMemoryLimitInput />
        </EuiFlexItem>
        <EuiFlexItem />
      </EuiFlexGroup>
    </Fragment>
  );
};
