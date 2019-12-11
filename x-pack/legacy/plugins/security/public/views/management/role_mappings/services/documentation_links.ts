/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ELASTIC_WEBSITE_URL, DOC_LINK_VERSION } from 'ui/documentation_links';

class DocumentationLinksService {
  private esDocBasePath = `${ELASTIC_WEBSITE_URL}guide/en/elasticsearch/reference/${DOC_LINK_VERSION}`;

  public getRoleMappingDocUrl() {
    return `${this.esDocBasePath}/mapping-roles.html`;
  }

  public getRoleMappingAPIDocUrl() {
    return `${this.esDocBasePath}/security-api-put-role-mapping.html`;
  }

  public getRoleMappingTemplateDocUrl() {
    return `${this.esDocBasePath}/security-api-put-role-mapping.html#_role_templates`;
  }

  public getRoleMappingFieldRulesDocUrl() {
    return `${this.esDocBasePath}/role-mapping-resources.html#mapping-roles-rule-field`;
  }
}

export const documentationLinks = new DocumentationLinksService();
