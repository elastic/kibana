/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EcsVersion } from '@elastic/ecs';

import {
  FIELD,
  ECS_MAPPING_TYPE_EXPECTED,
  INDEX_MAPPING_TYPE_ACTUAL,
} from '../../../compare_fields_table/translations';
import {
  getSummaryMarkdownComment,
  getIncompatibleMappingsMarkdownTableRows,
  getMarkdownComment,
  getMarkdownTable,
  getSummaryTableMarkdownComment,
  getTabCountsMarkdownComment,
} from '../../index_properties/markdown/helpers';
import * as i18n from '../../index_properties/translations';
import { SAME_FAMILY_FIELD_MAPPINGS_TABLE_TITLE } from './translations';
import type { EcsBasedFieldMetadata, IlmPhase, PartitionedFieldMetadata } from '../../../types';

export const getSameFamilyMarkdownComment = (fieldsInSameFamily: number): string =>
  getMarkdownComment({
    suggestedAction: `${i18n.SAME_FAMILY_CALLOUT({
      fieldCount: fieldsInSameFamily,
      version: EcsVersion,
    })}

${i18n.FIELDS_WITH_MAPPINGS_SAME_FAMILY}
`,
    title: i18n.SAME_FAMILY_CALLOUT_TITLE(fieldsInSameFamily),
  });

export const getSameFamilyMappings = (
  enrichedFieldMetadata: EcsBasedFieldMetadata[]
): EcsBasedFieldMetadata[] => enrichedFieldMetadata.filter((x) => x.isInSameFamily);

export const getSameFamilyMarkdownTablesComment = ({
  sameFamilyMappings,
  indexName,
}: {
  sameFamilyMappings: EcsBasedFieldMetadata[];
  indexName: string;
}): string => `
${
  sameFamilyMappings.length > 0
    ? getMarkdownTable({
        enrichedFieldMetadata: sameFamilyMappings,
        getMarkdownTableRows: getIncompatibleMappingsMarkdownTableRows,
        headerNames: [FIELD, ECS_MAPPING_TYPE_EXPECTED, INDEX_MAPPING_TYPE_ACTUAL],
        title: SAME_FAMILY_FIELD_MAPPINGS_TABLE_TITLE(indexName),
      })
    : ''
}
`;

export const getAllSameFamilyMarkdownComments = ({
  docsCount,
  formatBytes,
  formatNumber,
  ilmPhase,
  indexName,
  isILMAvailable,
  partitionedFieldMetadata,
  patternDocsCount,
  sizeInBytes,
}: {
  docsCount: number;
  formatBytes: (value: number | undefined) => string;
  formatNumber: (value: number | undefined) => string;
  ilmPhase: IlmPhase | undefined;
  indexName: string;
  isILMAvailable: boolean;
  partitionedFieldMetadata: PartitionedFieldMetadata;
  patternDocsCount: number;
  sizeInBytes: number | undefined;
}): string[] => {
  const sameFamilyMappings = getSameFamilyMappings(partitionedFieldMetadata.sameFamily);
  const fieldsInSameFamily = partitionedFieldMetadata.sameFamily.length;

  const incompatibleFieldsMarkdownComment =
    partitionedFieldMetadata.sameFamily.length > 0
      ? getSameFamilyMarkdownComment(fieldsInSameFamily)
      : '';

  return [
    getSummaryMarkdownComment(indexName),
    getSummaryTableMarkdownComment({
      docsCount,
      formatBytes,
      formatNumber,
      ilmPhase,
      indexName,
      isILMAvailable,
      partitionedFieldMetadata,
      patternDocsCount,
      sizeInBytes,
    }),
    getTabCountsMarkdownComment(partitionedFieldMetadata),
    incompatibleFieldsMarkdownComment,
    getSameFamilyMarkdownTablesComment({
      sameFamilyMappings,
      indexName,
    }),
  ].filter((x) => x !== '');
};
