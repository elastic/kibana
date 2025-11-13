/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { getESQLAdHocDataview } from '@kbn/esql-utils';
import { ESQLSource } from './esql_source';

describe('getIndexPatternId', () => {
  test('should return same dataViewId as getESQLAdHocDataview', async () => {
    const esql = 'from kibana_sample_data_logs | keep geo.coordinates';
    const esqlSource = new ESQLSource({ esql });
    expect(esqlSource.getIndexPatternId()).toBe(
      'e3465e67bdeced2befff9f9dca7ecf9c48504cad68a10efd881f4c7dd5ade28a'
    );

    const dataStartService = dataPluginMock.createStartContract();
    await getESQLAdHocDataview(esql, dataStartService.dataViews);
    const createSpecParameter = (dataStartService.dataViews.create as jest.Mock).mock.calls[0][0];
    expect(createSpecParameter.id).toBe(esqlSource.getIndexPatternId());
  });
});
