/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { Fragment, useContext } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';

import { BucketSpan } from '../bucket_span';
import { Influencers } from '../influencers';
import { ModelMemoryLimitInput } from '../../../common/model_memory_limit';
import { QueryDelayInput } from '../../../datafeed_step/components/query_delay';
import { FrequencyInput } from '../../../datafeed_step/components/frequency';
import { JobCreatorContext } from '../../../job_creator_context';
import { isEsqlAdvancedJobCreator } from '../../../../../common/job_creator';

interface Props {
  setIsValid: (proceed: boolean) => void;
}

export const AdvancedSettings: FC<Props> = ({ setIsValid }) => {
  const { jobCreator } = useContext(JobCreatorContext);
  // the advanced ES|QL wizard has no datafeed step, so its datafeed settings are set here
  const showDatafeedSettings = isEsqlAdvancedJobCreator(jobCreator);
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
      <EuiSpacer size="s" />
      <EuiFlexGroup gutterSize="xl">
        <EuiFlexItem>
          <ModelMemoryLimitInput />
        </EuiFlexItem>
        <EuiFlexItem>{showDatafeedSettings && <QueryDelayInput />}</EuiFlexItem>
      </EuiFlexGroup>
      {showDatafeedSettings && (
        <>
          <EuiSpacer size="s" />
          <EuiFlexGroup gutterSize="xl">
            <EuiFlexItem>
              <FrequencyInput />
            </EuiFlexItem>
            <EuiFlexItem />
          </EuiFlexGroup>
        </>
      )}
    </Fragment>
  );
};
