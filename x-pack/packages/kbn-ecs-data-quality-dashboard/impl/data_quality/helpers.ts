/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  IlmExplainLifecycleLifecycleExplain,
  IndicesStatsIndicesStats,
} from '@elastic/elasticsearch/lib/api/types';
import { has, sortBy } from 'lodash/fp';
import { getIlmPhase } from './data_quality_panel/pattern/helpers';
import { getFillColor } from './data_quality_panel/tabs/summary_tab/helpers';

import * as i18n from './translations';

import type {
  DataQualityCheckResult,
  EcsMetadata,
  EnrichedFieldMetadata,
  ErrorSummary,
  PartitionedFieldMetadata,
  PartitionedFieldMetadataStats,
  PatternRollup,
  UnallowedValueCount,
} from './types';

const EMPTY_INDEX_NAMES: string[] = [];

export const getIndexNames = ({
  ilmExplain,
  ilmPhases,
  stats,
}: {
  ilmExplain: Record<string, IlmExplainLifecycleLifecycleExplain> | null;
  ilmPhases: string[];
  stats: Record<string, IndicesStatsIndicesStats> | null;
}): string[] => {
  if (ilmExplain != null && stats != null) {
    const allIndexNames = Object.keys(stats);
    const filteredByIlmPhase = allIndexNames.filter((indexName) =>
      ilmPhases.includes(getIlmPhase(ilmExplain[indexName]) ?? '')
    );

    return filteredByIlmPhase;
  } else {
    return EMPTY_INDEX_NAMES;
  }
};

export interface FieldType {
  field: string;
  type: string;
}

function shouldReadKeys(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const getNextPathWithoutProperties = ({
  key,
  pathWithoutProperties,
  value,
}: {
  key: string;
  pathWithoutProperties: string;
  value: unknown;
}): string => {
  if (!pathWithoutProperties) {
    return key;
  }

  if (shouldReadKeys(value) && key === 'properties') {
    return `${pathWithoutProperties}`; // TODO: wrap required?
  } else {
    return `${pathWithoutProperties}.${key}`;
  }
};

export function getFieldTypes(mappingsProperties: Record<string, unknown>): FieldType[] {
  if (!shouldReadKeys(mappingsProperties)) {
    throw new TypeError(`Root value is not flatten-able, received ${mappingsProperties}`);
  }

  const result: FieldType[] = [];
  (function flatten(prefix, object, pathWithoutProperties) {
    for (const [key, value] of Object.entries(object)) {
      const path = prefix ? `${prefix}.${key}` : key;

      const nextPathWithoutProperties = getNextPathWithoutProperties({
        key,
        pathWithoutProperties,
        value,
      });

      if (shouldReadKeys(value)) {
        flatten(path, value, nextPathWithoutProperties);
      } else {
        if (nextPathWithoutProperties.endsWith('.type')) {
          const pathWithoutType = nextPathWithoutProperties.slice(
            0,
            nextPathWithoutProperties.lastIndexOf('.type')
          );

          result.push({
            field: pathWithoutType,
            type: `${value}`,
          });
        }
      }
    }
  })('', mappingsProperties, '');

  return result;
}

export const getEnrichedFieldMetadata = ({
  ecsMetadata,
  fieldMetadata,
  unallowedValues,
}: {
  ecsMetadata: Record<string, EcsMetadata>;
  fieldMetadata: FieldType;
  unallowedValues: Record<string, UnallowedValueCount[]>;
}): EnrichedFieldMetadata => {
  const { field, type } = fieldMetadata;
  const indexInvalidValues = unallowedValues[field] ?? [];

  if (has(fieldMetadata.field, ecsMetadata)) {
    return {
      ...ecsMetadata[field],
      indexFieldName: field,
      indexFieldType: type,
      indexInvalidValues,
      hasEcsMetadata: true,
      isEcsCompliant: type === ecsMetadata[field].type && indexInvalidValues.length === 0,
    };
  } else {
    return {
      indexFieldName: field,
      indexFieldType: type,
      indexInvalidValues,
      hasEcsMetadata: false,
      isEcsCompliant: false,
    };
  }
};

export const getMissingTimestampFieldMetadata = (): EnrichedFieldMetadata => ({
  description: i18n.TIMESTAMP_DESCRIPTION,
  hasEcsMetadata: true,
  indexFieldName: '@timestamp',
  indexFieldType: '-',
  indexInvalidValues: [],
  isEcsCompliant: false,
  type: 'date',
});

export const getPartitionedFieldMetadata = (
  enrichedFieldMetadata: EnrichedFieldMetadata[]
): PartitionedFieldMetadata =>
  enrichedFieldMetadata.reduce<PartitionedFieldMetadata>(
    (acc, x) => ({
      all: [...acc.all, x],
      ecsCompliant: x.isEcsCompliant ? [...acc.ecsCompliant, x] : acc.ecsCompliant,
      custom: !x.hasEcsMetadata ? [...acc.custom, x] : acc.custom,
      incompatible:
        x.hasEcsMetadata && !x.isEcsCompliant ? [...acc.incompatible, x] : acc.incompatible,
    }),
    {
      all: [],
      ecsCompliant: [],
      custom: [],
      incompatible: [],
    }
  );

export const getPartitionedFieldMetadataStats = (
  partitionedFieldMetadata: PartitionedFieldMetadata
): PartitionedFieldMetadataStats => {
  const { all, ecsCompliant, custom, incompatible } = partitionedFieldMetadata;

  return {
    all: all.length,
    ecsCompliant: ecsCompliant.length,
    custom: custom.length,
    incompatible: incompatible.length,
  };
};

export const hasValidTimestampMapping = (enrichedFieldMetadata: EnrichedFieldMetadata[]): boolean =>
  enrichedFieldMetadata.some(
    (x) => x.indexFieldName === '@timestamp' && x.indexFieldType === 'date'
  );

export const getDocsCount = ({
  indexName,
  stats,
}: {
  indexName: string;
  stats: Record<string, IndicesStatsIndicesStats> | null;
}): number => (stats && stats[indexName]?.total?.docs?.count) ?? 0;

export const getTotalDocsCount = ({
  indexNames,
  stats,
}: {
  indexNames: string[];
  stats: Record<string, IndicesStatsIndicesStats> | null;
}): number =>
  indexNames.reduce(
    (acc: number, indexName: string) => acc + getDocsCount({ stats, indexName }),
    0
  );

export const EMPTY_STAT = '--';

/**
 * Returns an i18n description of an an ILM phase
 */
export const getIlmPhaseDescription = (phase: string): string => {
  switch (phase) {
    case 'hot':
      return i18n.HOT_DESCRIPTION;
    case 'warm':
      return i18n.WARM_DESCRIPTION;
    case 'cold':
      return i18n.COLD_DESCRIPTION;
    case 'frozen':
      return i18n.FROZEN_DESCRIPTION;
    case 'unmanaged':
      return i18n.UNMANAGED_DESCRIPTION;
    default:
      return ' ';
  }
};

export const getPatternIlmPhaseDescription = ({
  indices,
  pattern,
  phase,
}: {
  indices: number;
  pattern: string;
  phase: string;
}): string => {
  switch (phase) {
    case 'hot':
      return i18n.HOT_PATTERN_TOOLTIP({ indices, pattern });
    case 'warm':
      return i18n.WARM_PATTERN_TOOLTIP({ indices, pattern });
    case 'cold':
      return i18n.COLD_PATTERN_TOOLTIP({ indices, pattern });
    case 'frozen':
      return i18n.FROZEN_PATTERN_TOOLTIP({ indices, pattern });
    case 'unmanaged':
      return i18n.UNMANAGED_PATTERN_TOOLTIP({ indices, pattern });
    default:
      return '';
  }
};

export const getTotalPatternIncompatible = (
  results: Record<string, DataQualityCheckResult> | undefined
): number | undefined => {
  if (results == null) {
    return undefined;
  }

  const allResults = Object.values(results);

  return allResults.reduce<number>((acc, { incompatible }) => acc + (incompatible ?? 0), 0);
};

export const getTotalPatternIndicesChecked = (patternRollup: PatternRollup | undefined): number => {
  if (patternRollup != null && patternRollup.results != null) {
    const allResults = Object.values(patternRollup.results);
    const nonErrorResults = allResults.filter(({ error }) => error == null);

    return nonErrorResults.length;
  } else {
    return 0;
  }
};

export const getIncompatibleStatColor = (incompatible: number | undefined): string | undefined =>
  incompatible != null && incompatible > 0 ? getFillColor('incompatible') : undefined;

export const getErrorSummary = ({
  error,
  indexName,
  pattern,
}: DataQualityCheckResult): ErrorSummary => ({
  error: String(error),
  indexName,
  pattern,
});

export const getErrorSummariesForRollup = (
  patternRollup: PatternRollup | undefined
): ErrorSummary[] => {
  const maybePatternErrorSummary: ErrorSummary[] =
    patternRollup != null && patternRollup.error != null
      ? [{ pattern: patternRollup.pattern, indexName: null, error: patternRollup.error }]
      : [];

  if (patternRollup != null && patternRollup.results != null) {
    const unsortedResults: DataQualityCheckResult[] = Object.values(patternRollup.results);
    const sortedResults = sortBy('indexName', unsortedResults);

    return sortedResults.reduce<ErrorSummary[]>(
      (acc, result) => [...acc, ...(result.error != null ? [getErrorSummary(result)] : [])],
      maybePatternErrorSummary
    );
  } else {
    return maybePatternErrorSummary;
  }
};

export const getErrorSummaries = (
  patternRollups: Record<string, PatternRollup>
): ErrorSummary[] => {
  const allPatterns: string[] = Object.keys(patternRollups);

  // sort the patterns A-Z:
  const sortedPatterns = [...allPatterns].sort((a, b) => {
    return a.localeCompare(b);
  });

  return sortedPatterns.reduce<ErrorSummary[]>(
    (acc, pattern) => [...acc, ...getErrorSummariesForRollup(patternRollups[pattern])],
    []
  );
};
