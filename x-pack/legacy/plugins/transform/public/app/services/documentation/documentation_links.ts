/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { TRANSFORM_DOC_PATHS } from '../../constants';

class DocumentationLinksService {
  private esPluginDocBasePath: string = '';

  public init(esPluginDocBasePath: string): void {
    this.esPluginDocBasePath = esPluginDocBasePath;
  }

  public getTransformPluginDocUrl() {
    return `${this.esPluginDocBasePath}${TRANSFORM_DOC_PATHS.plugins}`;
  }
}

export const documentationLinksService = new DocumentationLinksService();
