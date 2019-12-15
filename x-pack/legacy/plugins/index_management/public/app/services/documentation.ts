/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DocLinksStart } from '../../../../../../../src/core/public';
import { DataType, ConfigType } from '../components/mappings_editor/types';
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

  public getTypeDocLink = (type: DataType | ConfigType, uri = 'main'): string | undefined => {
    const TYPES = { ...TYPE_DEFINITION } as {
      [key: string]: any;
      documentation?: {
        [key: string]: string;
      };
    };
    const typeDefinition = TYPES[type];

    if (!typeDefinition || !typeDefinition.documentation || !typeDefinition.documentation[uri]) {
      return undefined;
    }
    return `${this.esDocsBase}${typeDefinition.documentation[uri]}`;
  };

  public getMappingTypesLink() {
    return `${this.esDocsBase}/mapping-types.html`;
  }

  public getDynamicMappingLink() {
    return `${this.esDocsBase}/dynamic-field-mapping.html`;
  }

  public getMappingSourceFieldLink() {
    return `${this.esDocsBase}/mapping-source-field.html`;
  }

  public getDisablingMappingSourceFieldLink() {
    return `${this.esDocsBase}/mapping-source-field.html#disable-source-field`;
  }

  public getNullValueLink() {
    return `${this.esDocsBase}/null-value.html`;
  }

  public getTermVectorLink() {
    return `${this.esDocsBase}/term-vector.html`;
  }

  public getStoreLink() {
    return `${this.esDocsBase}/mapping-store.html`;
  }

  public getSimilarityLink() {
    return `${this.esDocsBase}/similarity.html`;
  }

  public getNormsLink() {
    return `${this.esDocsBase}/norms.html`;
  }

  public getIndexLink() {
    return `${this.esDocsBase}/mapping-index.html`;
  }

  public getIgnoreMalformedLink() {
    return `${this.esDocsBase}/ignore-malformed.html`;
  }

  public getFormatLink() {
    return `${this.esDocsBase}/mapping-date-format.html`;
  }

  public getEagerGlobalOrdinalsLink() {
    return `${this.esDocsBase}/eager-global-ordinals.html`;
  }

  public getDocValuesLink() {
    return `${this.esDocsBase}/doc-values.html`;
  }

  public getCopyToLink() {
    return `${this.esDocsBase}/copy-to.html`;
  }

  public getCoerceLink() {
    return `${this.esDocsBase}/coerce.html`;
  }

  public getBoostLink() {
    return `${this.esDocsBase}/mapping-boost.html`;
  }

  public getNormalizerLink() {
    return `${this.esDocsBase}/normalizer.html`;
  }

  public getIgnoreAboveLink() {
    return `${this.esDocsBase}/ignore-above.html`;
  }

  public getFielddataLink() {
    return `${this.esDocsBase}/fielddata.html`;
  }

  public getIndexPhrasesLink() {
    return `${this.esDocsBase}/index-phrases.html`;
  }

  public getIndexPrefixesLink() {
    return `${this.esDocsBase}/index-prefixes.html`;
  }

  public getPositionIncrementGapLink() {
    return `${this.esDocsBase}/position-increment-gap.html`;
  }

  public getAnalyzerLink() {
    return `${this.esDocsBase}/analyzer.html`;
  }

  public getEnablingFielddataLink() {
    return `${this.esDocsBase}/fielddata.html#before-enabling-fielddata`;
  }

  public getDateFormatLink() {
    return `${this.esDocsBase}/mapping-date-format.html`;
  }
}

export const documentationService = new DocumentationService();
