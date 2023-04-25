/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EcsVersion } from '@kbn/ecs';

import { getIncompatiableFieldsInSameFamilyCount } from '../callouts/incompatible_callout/helpers';
import {
  getSummaryMarkdownComment,
  getIncompatibleMappingsMarkdownTableRows,
  getIncompatibleValuesMarkdownTableRows,
  getMarkdownComment,
  getMarkdownTable,
  getSummaryTableMarkdownComment,
  getTabCountsMarkdownComment,
} from '../../index_properties/markdown/helpers';
import { getFillColor } from '../summary_tab/helpers';
import * as i18n from '../../index_properties/translations';
import type { EnrichedFieldMetadata, IlmPhase, PartitionedFieldMetadata } from '../../../types';
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
} from '../../../compare_fields_table/translations';

export const getIncompatibleFieldsMarkdownComment = ({
  fieldsInSameFamily,
  incompatible,
}: {
  fieldsInSameFamily: number;
  incompatible: number;
}): string =>
  getMarkdownComment({
    suggestedAction: `${i18n.INCOMPATIBLE_CALLOUT({
      fieldCount: incompatible,
      version: EcsVersion,
    })}

${i18n.INCOMPATIBLE_FIELDS_WITH}

${i18n.WHEN_AN_INCOMPATIBLE_FIELD}
${i18n.DETECTION_ENGINE_RULES_MAY_NOT_MATCH}
${i18n.PAGES_MAY_NOT_DISPLAY_EVENTS}
${i18n.MAPPINGS_THAT_CONFLICT_WITH_ECS}
`,
    title: i18n.INCOMPATIBLE_CALLOUT_TITLE({ fieldCount: incompatible, fieldsInSameFamily }),
  });

export const showInvalidCallout = (enrichedFieldMetadata: EnrichedFieldMetadata[]): boolean =>
  enrichedFieldMetadata.length > 0;

export const getIncompatibleColor = (): string => getFillColor('incompatible');

export const getIncompatibleMappings = (
  enrichedFieldMetadata: EnrichedFieldMetadata[]
): EnrichedFieldMetadata[] =>
  enrichedFieldMetadata.filter((x) => !x.isEcsCompliant && x.type !== x.indexFieldType);

export const getIncompatibleValues = (
  enrichedFieldMetadata: EnrichedFieldMetadata[]
): EnrichedFieldMetadata[] =>
  enrichedFieldMetadata.filter((x) => !x.isEcsCompliant && x.indexInvalidValues.length > 0);

export const getIncompatibleFieldsMarkdownTablesComment = ({
  incompatibleMappings,
  incompatibleValues,
  indexName,
}: {
  incompatibleMappings: EnrichedFieldMetadata[];
  incompatibleValues: EnrichedFieldMetadata[];
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
  partitionedFieldMetadata,
  patternDocsCount,
  sizeInBytes,
}: {
  docsCount: number;
  formatBytes: (value: number | undefined) => string;
  formatNumber: (value: number | undefined) => string;
  ilmPhase: IlmPhase | undefined;
  indexName: string;
  partitionedFieldMetadata: PartitionedFieldMetadata;
  patternDocsCount: number;
  sizeInBytes: number | undefined;
}): string[] => {
  const incompatibleMappings = getIncompatibleMappings(partitionedFieldMetadata.incompatible);
  const incompatibleValues = getIncompatibleValues(partitionedFieldMetadata.incompatible);
  const fieldsInSameFamily = getIncompatiableFieldsInSameFamilyCount(
    partitionedFieldMetadata.incompatible
  );

  const incompatibleFieldsMarkdownComment =
    partitionedFieldMetadata.incompatible.length > 0
      ? getIncompatibleFieldsMarkdownComment({
          fieldsInSameFamily,
          incompatible: partitionedFieldMetadata.incompatible.length,
        })
      : '';

  return [
    getSummaryMarkdownComment(indexName),
    getSummaryTableMarkdownComment({
      docsCount,
      formatBytes,
      formatNumber,
      ilmPhase,
      indexName,
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
