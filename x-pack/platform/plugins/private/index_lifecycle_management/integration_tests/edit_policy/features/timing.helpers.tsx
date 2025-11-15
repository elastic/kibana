/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core/public';
import { createMinAgeActions, createTogglePhaseAction } from '../../helpers';
import { initTestBed } from '../init_test_bed';
import type { InitTestBed } from '../init_test_bed';

export interface TimingTestBed extends InitTestBed {
  actions: {
    togglePhase: ReturnType<typeof createTogglePhaseAction>;
    warm: ReturnType<typeof createMinAgeActions>;
    cold: ReturnType<typeof createMinAgeActions>;
    frozen: ReturnType<typeof createMinAgeActions>;
    delete: ReturnType<typeof createMinAgeActions>;
  };
}

export const setup = (httpSetup: HttpSetup): TimingTestBed => {
  const result = initTestBed(httpSetup);

  return {
    ...result,
    actions: {
      togglePhase: createTogglePhaseAction(),
      warm: {
        ...createMinAgeActions('warm'),
      },
      cold: {
        ...createMinAgeActions('cold'),
      },
      frozen: {
        ...createMinAgeActions('frozen'),
      },
      delete: {
        ...createMinAgeActions('delete'),
      },
    },
  };
};
