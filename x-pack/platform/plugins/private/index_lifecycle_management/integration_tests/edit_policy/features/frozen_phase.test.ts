/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';
import { screen } from '@testing-library/react';
import { licensingMock } from '@kbn/licensing-plugin/public/mocks';
import { setupEnvironment } from '../../helpers';
import { initTestBed } from '../init_test_bed';

describe('<EditPolicy /> frozen phase', () => {
  let httpRequestsMockHelpers: ReturnType<typeof setupEnvironment>['httpRequestsMockHelpers'];
  let httpSetup: ReturnType<typeof setupEnvironment>['httpSetup'];

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    ({ httpRequestsMockHelpers, httpSetup } = setupEnvironment());
  });

  describe('on non-enterprise license', () => {
    beforeEach(async () => {
      httpRequestsMockHelpers.setDefaultResponses();

      initTestBed(httpSetup, {
        appServicesContext: {
          license: licensingMock.createLicense({ license: { type: 'basic' } }),
        },
      });

      await act(async () => {
        await jest.runOnlyPendingTimersAsync();
      });
    });

    test('should not be available', () => {
      expect(screen.queryByTestId('frozen-phase')).not.toBeInTheDocument();
    });
  });
});
