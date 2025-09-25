/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { of } from 'rxjs';

import type { TourManagerContract } from './lib';

export const createSolutionViewTourManagerMock = (): jest.Mocked<TourManagerContract> => ({
  showTour$: of(false),
  startTour: jest.fn().mockResolvedValue({ result: 'not_available' }),
  finishTour: jest.fn().mockResolvedValue(void 0),
  waitForTourEnd: jest.fn().mockResolvedValue(void 0),
});
