/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { snExternalServiceConfig } from './config';

/**
 * The purpose of this test is to
 * prevent developers from accidentally
 * change important configuration values
 * such as the scope or the import set table
 * of our ServiceNow application
 */

describe('config', () => {
  test('ITSM: the config are correct', async () => {
    const snConfig = snExternalServiceConfig['.servicenow'];
    expect(snConfig).toEqual({
      importSetTable: 'x_elas2_inc_int_elastic_incident',
      appScope: 'x_elas2_inc_int',
      table: 'incident',
      useImportAPI: true,
      commentFieldKey: 'work_notes',
      appId: '7148dbc91bf1f450ced060a7234bcb88',
    });
  });

  test('SIR: the config are correct', async () => {
    const snConfig = snExternalServiceConfig['.servicenow-sir'];
    expect(snConfig).toEqual({
      importSetTable: 'x_elas2_sir_int_elastic_si_incident',
      appScope: 'x_elas2_sir_int',
      table: 'sn_si_incident',
      useImportAPI: true,
      commentFieldKey: 'work_notes',
      appId: '2f0746801baeb01019ae54e4604bcb0f',
    });
  });

  test('ITOM: the config are correct', async () => {
    const snConfig = snExternalServiceConfig['.servicenow-itom'];
    expect(snConfig).toEqual({
      importSetTable: 'x_elas2_inc_int_elastic_incident',
      appScope: 'x_elas2_inc_int',
      table: 'em_event',
      useImportAPI: false,
      commentFieldKey: 'work_notes',
    });
  });
});
