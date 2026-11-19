/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup } from '@kbn/core/server';
import { coreMock } from '@kbn/core/server/mocks';
import type { CasesServerStartDependencies } from '../../types';

/** Creates a CoreSetup mock whose spaces service reports the given solution. */
export const makeCoreWithSolution = (
  solution: string | undefined
): CoreSetup<CasesServerStartDependencies> => {
  const coreSetup = coreMock.createSetup();
  const pluginsStart = {
    spaces: {
      spacesService: {
        getActiveSpace: jest.fn().mockResolvedValue({ solution }),
      },
    },
  };
  coreSetup.getStartServices.mockResolvedValue([coreMock.createStart(), pluginsStart, {}]);
  return coreSetup;
};
