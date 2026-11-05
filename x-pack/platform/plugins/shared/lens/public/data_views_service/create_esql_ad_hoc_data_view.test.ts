/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { dataViewPluginMocks } from '@kbn/data-views-plugin/public/mocks';
import { EsqlSource } from '@kbn/data-source';
import { ESQL_TYPE } from '@kbn/data-view-utils';
import { createEsqlAdHocDataView } from './create_esql_ad_hoc_data_view';

describe('createEsqlAdHocDataView', () => {
  const dataViews = dataViewPluginMocks.createStartContract();

  beforeEach(() => {
    dataViews.create.mockReset();
  });

  it('creates the DataView with the datasetId of the query dataset', async () => {
    const { datasetId } = await EsqlSource.resolveDataset({
      query: 'FROM logs-*',
      timeFieldName: undefined,
    });

    await createEsqlAdHocDataView({ dataViews, query: 'FROM logs-* | LIMIT 10' });

    expect(dataViews.create).toHaveBeenCalledWith(
      expect.objectContaining({ id: datasetId, title: 'logs-*', type: ESQL_TYPE }),
      false
    );
  });

  it('uses the given id, e.g. the persisted one, instead of the datasetId', async () => {
    await createEsqlAdHocDataView({ dataViews, query: 'FROM logs-*', id: 'persisted-id' });

    expect(dataViews.create).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'persisted-id' }),
      false
    );
  });

  it('forwards allowNoIndex and skipFetchFields', async () => {
    await createEsqlAdHocDataView({
      dataViews,
      query: 'FROM logs-*',
      allowNoIndex: true,
      skipFetchFields: true,
    });

    expect(dataViews.create).toHaveBeenCalledWith(
      expect.objectContaining({ allowNoIndex: true }),
      true
    );
  });
});
