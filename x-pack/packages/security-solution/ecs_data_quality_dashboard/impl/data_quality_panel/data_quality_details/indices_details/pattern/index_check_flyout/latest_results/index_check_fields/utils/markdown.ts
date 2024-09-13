/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ALL_FIELDS,
  CUSTOM_FIELDS,
  ECS_COMPLIANT_FIELDS,
  INCOMPATIBLE_FIELDS,
  SAME_FAMILY,
} from '../../../../../../../translations';
import {
  escapeNewlines,
  getAllowedValues,
  getCodeFormattedValue,
} from '../../../../../../../utils/markdown';
import { CustomFieldMetadata, PartitionedFieldMetadata } from '../../../../../../../types';

export const getCustomMarkdownTableRows = (customFieldMetadata: CustomFieldMetadata[]): string =>
  customFieldMetadata
    .map(
      (x) =>
        `| ${escapeNewlines(x.indexFieldName)} | ${getCodeFormattedValue(
          x.indexFieldType
        )} | ${getAllowedValues(undefined)} |`
    )
    .join('\n');

export const getSummaryMarkdownComment = (indexName: string) =>
  `### ${escapeNewlines(indexName)}
`;

export const getTabCountsMarkdownComment = (
  partitionedFieldMetadata: PartitionedFieldMetadata
): string =>
  `### **${INCOMPATIBLE_FIELDS}** ${getCodeFormattedValue(
    `${partitionedFieldMetadata.incompatible.length}`
  )} **${SAME_FAMILY}** ${getCodeFormattedValue(
    `${partitionedFieldMetadata.sameFamily.length}`
  )} **${CUSTOM_FIELDS}** ${getCodeFormattedValue(
    `${partitionedFieldMetadata.custom.length}`
  )} **${ECS_COMPLIANT_FIELDS}** ${getCodeFormattedValue(
    `${partitionedFieldMetadata.ecsCompliant.length}`
  )} **${ALL_FIELDS}** ${getCodeFormattedValue(`${partitionedFieldMetadata.all.length}`)}
`;
