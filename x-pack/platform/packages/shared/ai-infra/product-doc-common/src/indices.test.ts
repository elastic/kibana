/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defaultInferenceEndpoints } from '@kbn/inference-common';
import {
  getOpenApiSpecIndexName,
  getProductDocIndexName,
  getSecurityLabsIndexName,
} from './indices';

const INJECTED_ID = `${defaultInferenceEndpoints.MULTILINGUAL_E5_SMALL},.kibana_9.6.0_001`;

describe('index name helpers', () => {
  it('omit the suffix for implied default ELSER ids', () => {
    expect(getProductDocIndexName('kibana')).toBe('.kibana_ai_product_doc_kibana');
    expect(getSecurityLabsIndexName(defaultInferenceEndpoints.ELSER)).toBe(
      '.kibana_ai_security_labs'
    );
    expect(getOpenApiSpecIndexName()).toBe('.kibana_ai_openapi_spec');
  });

  it('append a valid non-ELSER id', () => {
    const id = defaultInferenceEndpoints.MULTILINGUAL_E5_SMALL;
    expect(getProductDocIndexName('kibana', id)).toBe(`.kibana_ai_product_doc_kibana-${id}`);
    expect(getSecurityLabsIndexName(id)).toBe(`.kibana_ai_security_labs-${id}`);
    expect(getOpenApiSpecIndexName(id)).toBe(`.kibana_ai_openapi_spec-${id}`);
  });

  it('throw instead of building a multi-index name from an invalid id', () => {
    expect(() => getProductDocIndexName('kibana', INJECTED_ID)).toThrow('inferenceId must be');
    expect(() => getSecurityLabsIndexName(INJECTED_ID)).toThrow('inferenceId must be');
    expect(() => getOpenApiSpecIndexName(INJECTED_ID)).toThrow('inferenceId must be');
    expect(() => getSecurityLabsIndexName('.jina-embeddings-v5-text-small*')).toThrow();
  });
});
