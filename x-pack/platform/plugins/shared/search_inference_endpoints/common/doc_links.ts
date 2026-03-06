/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DocLinks } from '@kbn/doc-links';

class InferenceEndpointsDocLinks {
  public createInferenceEndpoint: string = '';
  public elasticInferenceService: string = '';
  public semanticSearchElser: string = '';
  public semanticSearchE5: string = '';

  constructor() {}

  setDocLinks(newDocLinks: DocLinks) {
    this.createInferenceEndpoint = newDocLinks.inferenceManagement.inferenceAPIDocumentation;
    this.elasticInferenceService = newDocLinks.enterpriseSearch.elasticInferenceService;
    this.semanticSearchElser = newDocLinks.enterpriseSearch.elser;
    this.semanticSearchE5 = newDocLinks.enterpriseSearch.e5Model;
  }
}

export const docLinks = new InferenceEndpointsDocLinks();
