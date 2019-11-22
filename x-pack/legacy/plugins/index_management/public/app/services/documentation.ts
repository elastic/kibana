/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DocLinksStart } from '../../../../../../../src/core/public';
import { DataType } from '../components/mappings_editor/types';
import { TYPE_DEFINITION } from '../components/mappings_editor/constants';

class DocumentationService {
  private esDocsBase: string = '';
  private kibanaDocsBase: string = '';

  public init(docLinks: DocLinksStart): void {
    const { DOC_LINK_VERSION, ELASTIC_WEBSITE_URL } = docLinks;
    const docsBase = `${ELASTIC_WEBSITE_URL}guide/en`;

    this.esDocsBase = `${docsBase}/elasticsearch/reference/${DOC_LINK_VERSION}`;
    this.kibanaDocsBase = `${docsBase}/kibana/${DOC_LINK_VERSION}`;
  }

  public getSettingsDocumentationLink() {
    return `${this.esDocsBase}/index-modules.html#index-modules-settings`;
  }

  public getMappingDocumentationLink() {
    return `${this.esDocsBase}/mapping.html`;
  }

  public getTemplatesDocumentationLink() {
    return `${this.esDocsBase}/indices-templates.html`;
  }

  public getIdxMgmtDocumentationLink() {
    return `${this.kibanaDocsBase}/managing-indices.html`;
  }

  public getTypeDocLink = (type: DataType, uri = 'main'): string | undefined => {
    const typeDefinition = TYPE_DEFINITION[type];
    if (!typeDefinition || !typeDefinition.documentation || !typeDefinition.documentation[uri]) {
      return undefined;
    }
    return `${this.esDocsBase}${typeDefinition.documentation[uri]}`;
  };
}

export const documentationService = new DocumentationService();
