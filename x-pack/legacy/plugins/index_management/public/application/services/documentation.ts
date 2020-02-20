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

  public setup(docLinks: DocLinksStart): void {
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

  public getRoutingLink() {
    return `${this.esDocsBase}/mapping-routing-field.html`;
  }

  public getTemplatesDocumentationLink() {
    return `${this.esDocsBase}/indices-templates.html`;
  }

  public getIdxMgmtDocumentationLink() {
    return `${this.kibanaDocsBase}/managing-indices.html`;
  }

  public getTypeDocLink = (type: DataType, docType = 'main'): string | undefined => {
    const typeDefinition = TYPE_DEFINITION[type];

    if (
      !typeDefinition ||
      !typeDefinition.documentation ||
      !typeDefinition.documentation[docType]
    ) {
      return undefined;
    }
    return `${this.esDocsBase}${typeDefinition.documentation[docType]}`;
  };

  public getMappingTypesLink() {
    return `${this.esDocsBase}/mapping-types.html`;
  }

  public getDynamicMappingLink() {
    return `${this.esDocsBase}/dynamic-field-mapping.html`;
  }

  public getPercolatorQueryLink() {
    return `${this.esDocsBase}/query-dsl-percolate-query.html`;
  }

  public getRankFeatureQueryLink() {
    return `${this.esDocsBase}/rank-feature.html`;
  }

  public getMetaFieldLink() {
    return `${this.esDocsBase}/mapping-meta-field.html`;
  }

  public getDynamicTemplatesLink() {
    return `${this.esDocsBase}/dynamic-templates.html`;
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

  public getFielddataFrequencyLink() {
    return `${this.esDocsBase}/fielddata.html#field-data-filtering`;
  }

  public getEnablingFielddataLink() {
    return `${this.esDocsBase}/fielddata.html#before-enabling-fielddata`;
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

  public getDateFormatLink() {
    return `${this.esDocsBase}/mapping-date-format.html`;
  }

  public getIndexOptionsLink() {
    return `${this.esDocsBase}/index-options.html`;
  }

  public getAlternativeToMappingTypesLink() {
    return `${this.esDocsBase}/removal-of-types.html#_alternatives_to_mapping_types`;
  }

  public getJoinMultiLevelsPerformanceLink() {
    return `${this.esDocsBase}/parent-join.html#_parent_join_and_performance`;
  }

  public getDynamicLink() {
    return `${this.esDocsBase}/dynamic.html`;
  }

  public getEnabledLink() {
    return `${this.esDocsBase}/enabled.html`;
  }

  public getWellKnownTextLink() {
    return 'http://docs.opengeospatial.org/is/12-063r5/12-063r5.html';
  }

  public getRootLocaleLink() {
    return 'https://docs.oracle.com/javase/8/docs/api/java/util/Locale.html#ROOT';
  }
}

export const documentationService = new DocumentationService();
