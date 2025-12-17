/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ensureFleetGlobalEsAssets } from '../../../../setup/ensure_fleet_global_es_assets';

import { stepInstallPrecheck } from './step_install_precheck';

jest.mock('../../../..');
jest.mock('../../../../setup/ensure_fleet_global_es_assets');

describe('stepInstallPrecheck', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call ensureFleetGlobalEsAssets', async () => {
    await stepInstallPrecheck();

    expect(jest.mocked(ensureFleetGlobalEsAssets)).toHaveBeenCalled();
  });
});
