/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockHttpValues } from '../../../__mocks__/kea_logic';

import { revertConnectorPipeline } from './revert_connector_pipeline_api_logic';

describe('RevertConnectorPipelineApiLogic', () => {
  it('should call delete pipeline endpoint', () => {
    const { http } = mockHttpValues;
    revertConnectorPipeline({ indexName: 'indexName' });
    expect(http.delete).toHaveBeenCalledWith(
      '/internal/enterprise_search/indices/indexName/pipelines'
    );
  });
});
