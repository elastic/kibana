/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { TRANSFORM_DOC_PATHS } from '../../constants';

class DocumentationLinksService {
  private esDocBasePath: string = '';

  public init(esDocBasePath: string): void {
    this.esDocBasePath = esDocBasePath;
  }

  public getTransformsDocUrl() {
    return `${this.esDocBasePath}${TRANSFORM_DOC_PATHS.transforms}`;
  }
}

export const documentationLinksService = new DocumentationLinksService();
