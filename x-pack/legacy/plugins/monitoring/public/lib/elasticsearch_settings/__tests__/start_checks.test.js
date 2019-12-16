/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SettingsChecker } from '../checkers/settings_checker';
import { startChecks } from '../';

describe('Start Checks of Elasticsearch Settings', () => {
  const getHttp = data => ({
    get() {
      return Promise.resolve({ data });
    },
  });

  it('should go through a list of checkers and run their executor until the no_data reason found', async () => {
    const checker1 = new SettingsChecker(getHttp({ found: false }));
    checker1.setApi('../api/check/example1');
    checker1.setMessage('Checking example for unit test 01');

    const checker2 = new SettingsChecker(getHttp({ found: false }));
    checker2.setApi('../api/check/example2');
    checker2.setMessage('Checking example for unit test 02');

    const checker3 = new SettingsChecker(
      getHttp({ found: true, reason: { context: 'unit_test 03' } })
    );
    checker3.setApi('../api/check/example3');
    checker3.setMessage('Checking example for unit test 03');

    const checkers = [checker1, checker2, checker3];
    const mockSetInModel = data => data;

    expect(await startChecks(checkers, mockSetInModel)).toEqual({
      reason: { context: 'unit_test 03' },
      isLoading: false,
      checkMessage: null,
    });
  });
});
