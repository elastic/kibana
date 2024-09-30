/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  IlmExplainLifecycleLifecycleExplain,
  IlmExplainLifecycleLifecycleExplainManaged,
  IlmExplainLifecycleLifecycleExplainUnmanaged,
} from '@elastic/elasticsearch/lib/api/types';
import { render, screen } from '@testing-library/react';
import React from 'react';

import { TestExternalProviders } from '../../../../../../mock/test_providers/test_providers';
import { IlmPhaseCounts } from '.';
import { getIlmExplainPhaseCounts } from '../../../utils/ilm_explain';

const hot: IlmExplainLifecycleLifecycleExplainManaged = {
  index: '.ds-packetbeat-8.6.1-2023.02.04-000001',
  managed: true,
  policy: 'packetbeat',
  index_creation_date_millis: 1675536751379,
  time_since_index_creation: '3.98d',
  lifecycle_date_millis: 1675536751379,
  age: '3.98d',
  phase: 'hot',
  phase_time_millis: 1675536751809,
  action: 'rollover',
  action_time_millis: 1675536751809,
  step: 'check-rollover-ready',
  step_time_millis: 1675536751809,
  phase_execution: {
    policy: 'packetbeat',
    version: 1,
    modified_date_in_millis: 1675536751205,
  },
};
const warm = {
  ...hot,
  phase: 'warm',
};
const cold = {
  ...hot,
  phase: 'cold',
};
const frozen = {
  ...hot,
  phase: 'frozen',
};

const managed: Record<string, IlmExplainLifecycleLifecycleExplainManaged> = {
  hot,
  warm,
  cold,
  frozen,
};

const unmanaged: IlmExplainLifecycleLifecycleExplainUnmanaged = {
  index: 'foo',
  managed: false,
};

const ilmExplain: Record<string, IlmExplainLifecycleLifecycleExplain> = {
  ...managed,
  [unmanaged.index]: unmanaged,
};

const ilmExplainPhaseCounts = getIlmExplainPhaseCounts(ilmExplain);

const pattern = 'packetbeat-*';

describe('IlmPhaseCounts', () => {
  test('it renders the expected counts', () => {
    render(
      <TestExternalProviders>
        <IlmPhaseCounts ilmExplainPhaseCounts={ilmExplainPhaseCounts} pattern={pattern} />
      </TestExternalProviders>
    );

    expect(screen.getByTestId('ilmPhaseCounts')).toHaveTextContent(
      'hot (1)unmanaged (1)warm (1)cold (1)frozen (1)'
    );
  });
});
