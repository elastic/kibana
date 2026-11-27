/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { of } from 'rxjs';
import type { PublicMethodsOf } from '@kbn/utility-types';
import type { AvailabilityService } from './availability_service';
import type { AvailabilityStatus } from './types';

const defaultAvailabilityStatus: AvailabilityStatus = { isAvailable: true };

// Outside of the mock, so we replicate reference stability of the original service implementation
const mockIsAvailable$ = of(true);
const mockAvailabilityStatus$ = of(defaultAvailabilityStatus);

export const createAvailabilityServiceMock = (): jest.Mocked<AvailabilityService> => {
  const mock: jest.Mocked<PublicMethodsOf<AvailabilityService>> = {
    setLicense$: jest.fn(),
    setUnavailableInServerlessTier: jest.fn(),
    getAvailabilityStatus$: jest.fn(() => mockAvailabilityStatus$),
    getIsAvailable$: jest.fn(() => mockIsAvailable$),
    getAvailabilityStatus: jest.fn(() => defaultAvailabilityStatus),
    stop: jest.fn(),
  };
  return mock as jest.Mocked<AvailabilityService>;
};
