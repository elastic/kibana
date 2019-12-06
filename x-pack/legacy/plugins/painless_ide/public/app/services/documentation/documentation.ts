/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DocLinksStart } from '../../../../../../../../src/core/public';

class DocumentationService {
  private esDocBasePath: string = '';

  public init(docLinks: DocLinksStart): void {
    const { DOC_LINK_VERSION, ELASTIC_WEBSITE_URL } = docLinks;
    this.esDocBasePath = `${ELASTIC_WEBSITE_URL}guide/en/elasticsearch/reference/${DOC_LINK_VERSION}`;
  }

  public getPainlessDocUrl() {
    return `${this.esDocBasePath}/modules-scripting-painless.html`;
  }
}

export const documentationService = new DocumentationService();
