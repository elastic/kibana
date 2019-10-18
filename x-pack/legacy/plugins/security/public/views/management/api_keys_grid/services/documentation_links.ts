/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ELASTIC_WEBSITE_URL, DOC_LINK_VERSION } from 'ui/documentation_links';

class DocumentationLinksService {
  private esDocBasePath = `${ELASTIC_WEBSITE_URL}guide/en/elasticsearch/reference/${DOC_LINK_VERSION}/`;

  public getApiKeyServiceSettingsDocUrl(): string {
    return `${this.esDocBasePath}security-settings.html#api-key-service-settings`;
  }

  public getCreateApiKeyDocUrl(): string {
    return `${this.esDocBasePath}security-api-create-api-key.html`;
  }
}

export const documentationLinks = new DocumentationLinksService();
