/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EcsVersion } from '@elastic/ecs';

import { escapeNewlines } from '../../../../../../../../utils/markdown';
import {
  getSummaryMarkdownComment,
  getIncompatibleMappingsMarkdownTableRows,
  getIncompatibleValuesMarkdownTableRows,
  getMarkdownComment,
  getMarkdownTable,
  getTabCountsMarkdownComment,
  getSummaryTableMarkdownComment,
} from '../../utils/markdown';
import * as i18n from '../../../translations';
import type {
  EcsBasedFieldMetadata,
  IlmPhase,
  PartitionedFieldMetadata,
} from '../../../../../../../../types';
import {
  INCOMPATIBLE_FIELD_MAPPINGS_TABLE_TITLE,
  INCOMPATIBLE_FIELD_VALUES_TABLE_TITLE,
} from './translations';
import {
  FIELD,
  ECS_MAPPING_TYPE_EXPECTED,
  INDEX_MAPPING_TYPE_ACTUAL,
  DOCUMENT_VALUES_ACTUAL,
  ECS_VALUES_EXPECTED,
} from '../compare_fields_table/translations';
import { getIsInSameFamily } from '../../../utils/get_is_in_same_family';

export const getIncompatibleFieldsMarkdownComment = (incompatible: number): string =>
  getMarkdownComment({
    suggestedAction: `${i18n.INCOMPATIBLE_CALLOUT(EcsVersion)}

${i18n.DETECTION_ENGINE_RULES_MAY_NOT_MATCH}
${i18n.PAGES_MAY_NOT_DISPLAY_EVENTS}
${i18n.MAPPINGS_THAT_CONFLICT_WITH_ECS}
`,
    title: i18n.INCOMPATIBLE_CALLOUT_TITLE(incompatible),
  });

export const showInvalidCallout = (ecsBasedFieldMetadata: EcsBasedFieldMetadata[]): boolean =>
  ecsBasedFieldMetadata.length > 0;

export const getIncompatibleMappings = (
  ecsBasedFieldMetadata: EcsBasedFieldMetadata[]
): EcsBasedFieldMetadata[] =>
  ecsBasedFieldMetadata.filter(
    (x) =>
      !x.isEcsCompliant &&
      x.type !== x.indexFieldType &&
      !getIsInSameFamily({ ecsExpectedType: x.type, type: x.indexFieldType })
  );

export const getIncompatibleMappingsFields = (
  ecsBasedFieldMetadata: EcsBasedFieldMetadata[]
): string[] =>
  ecsBasedFieldMetadata.reduce<string[]>((acc, x) => {
    if (
      !x.isEcsCompliant &&
      x.type !== x.indexFieldType &&
      !getIsInSameFamily({ ecsExpectedType: x.type, type: x.indexFieldType })
    ) {
      const field = escapeNewlines(x.indexFieldName);
      if (field != null) {
        return [...acc, field];
      }
    }
    return acc;
  }, []);

export const getSameFamilyFields = (ecsBasedFieldMetadata: EcsBasedFieldMetadata[]): string[] =>
  ecsBasedFieldMetadata.reduce<string[]>((acc, x) => {
    if (!x.isEcsCompliant && x.type !== x.indexFieldType && x.isInSameFamily) {
      const field = escapeNewlines(x.indexFieldName);
      if (field != null) {
        return [...acc, field];
      }
    }
    return acc;
  }, []);

export const getIncompatibleValues = (
  ecsBasedFieldMetadata: EcsBasedFieldMetadata[]
): EcsBasedFieldMetadata[] =>
  ecsBasedFieldMetadata.filter((x) => !x.isEcsCompliant && x.indexInvalidValues.length > 0);

export const getIncompatibleValuesFields = (
  ecsBasedFieldMetadata: EcsBasedFieldMetadata[]
): string[] =>
  ecsBasedFieldMetadata.reduce<string[]>((acc, x) => {
    if (!x.isEcsCompliant && x.indexInvalidValues.length > 0) {
      const field = escapeNewlines(x.indexFieldName);
      if (field != null) {
        return [...acc, field];
      }
    }
    return acc;
  }, []);

export const getIncompatibleFieldsMarkdownTablesComment = ({
  incompatibleMappings,
  incompatibleValues,
  indexName,
}: {
  incompatibleMappings: EcsBasedFieldMetadata[];
  incompatibleValues: EcsBasedFieldMetadata[];
  indexName: string;
}): string => `
${
  incompatibleMappings.length > 0
    ? getMarkdownTable({
        enrichedFieldMetadata: incompatibleMappings,
        getMarkdownTableRows: getIncompatibleMappingsMarkdownTableRows,
        headerNames: [FIELD, ECS_MAPPING_TYPE_EXPECTED, INDEX_MAPPING_TYPE_ACTUAL],
        title: INCOMPATIBLE_FIELD_MAPPINGS_TABLE_TITLE(indexName),
      })
    : ''
}
${
  incompatibleValues.length > 0
    ? getMarkdownTable({
        enrichedFieldMetadata: incompatibleValues,
        getMarkdownTableRows: getIncompatibleValuesMarkdownTableRows,
        headerNames: [FIELD, ECS_VALUES_EXPECTED, DOCUMENT_VALUES_ACTUAL],
        title: INCOMPATIBLE_FIELD_VALUES_TABLE_TITLE(indexName),
      })
    : ''
}
`;

export const getAllIncompatibleMarkdownComments = ({
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
  const incompatibleMappings = getIncompatibleMappings(partitionedFieldMetadata.incompatible);
  const incompatibleValues = getIncompatibleValues(partitionedFieldMetadata.incompatible);

  const incompatibleFieldsMarkdownComment =
    partitionedFieldMetadata.incompatible.length > 0
      ? getIncompatibleFieldsMarkdownComment(partitionedFieldMetadata.incompatible.length)
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
    getIncompatibleFieldsMarkdownTablesComment({
      incompatibleMappings,
      incompatibleValues,
      indexName,
    }),
  ].filter((x) => x !== '');
};
