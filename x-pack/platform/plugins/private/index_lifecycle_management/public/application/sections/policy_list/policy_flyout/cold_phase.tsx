/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { PhaseDescription } from './phase_description';
import { Phases } from '../../../../../common/types';
import {
  MinAge,
  Replicas,
  Downsample,
  Readonly,
  IndexPriority,
  DataAllocation,
  SearchableSnapshot,
} from './components';

export const ColdPhase = ({ phases }: { phases: Phases }) => {
  return (
    <PhaseDescription
      phase={'cold'}
      phases={phases}
      components={[
        MinAge,
        SearchableSnapshot,
        Replicas,
        Downsample,
        Readonly,
        DataAllocation,
        IndexPriority,
      ]}
    />
  );
};
