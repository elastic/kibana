/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { OBSERVABLE_TYPE_IPV4, OBSERVABLE_TYPE_IPV6 } from '../../../common/constants/observables';
import type { ObservablePost } from '../../../common/types/api';
import {
  DEFAULT_ECS_FIELD_MAPPINGS,
  buildFieldMappingIndex,
} from '../../../common/observable_types/ecs_field_mappings';
import type { EcsFieldMapping } from '../../../common/observable_types/ecs_field_mappings';

/**
 * Flattened key-value pair from an ECS document.
 * `value` may be a single string or an array of strings.
 */
export interface EcsFieldEntry {
  field: string;
  value?: string | string[] | null;
}

export interface ExtractionConfig {
  /**
   * ECS field → observable type mappings.
   * Falls back to DEFAULT_ECS_FIELD_MAPPINGS when omitted.
   */
  fieldMappings?: EcsFieldMapping[];

  /**
   * Per-typeKey exclusion patterns. Values matching any pattern for
   * their type are silently dropped.
   *
   * Example: `{ 'observable-type-user': ['SYSTEM', 'NT AUTHORITY\\*'] }`
   *
   * Strings are compared case-insensitively. Glob-style trailing `*` is
   * supported for prefix matching.
   */
  exclusionFilters?: Record<string, string[]>;

  /**
   * Description string attached to every extracted observable.
   * Defaults to 'Auto extracted observable'.
   */
  description?: string;
}

export interface BulkExtractionResult {
  /** Deduplicated observables across all input alerts. */
  observables: ObservablePost[];
  /** Number of alerts that were processed. */
  processedAlerts: number;
  /** Number of raw field values inspected. */
  fieldsInspected: number;
  /** Number of values dropped by exclusion filters. */
  excluded: number;
}

const DEFAULT_DESCRIPTION = 'Auto extracted observable';

export const getIPType = (ip: string): 'IPV4' | 'IPV6' => {
  return ip.includes(':') ? 'IPV6' : 'IPV4';
};

function matchesExclusion(value: string, patterns: string[]): boolean {
  const lower = value.toLowerCase();
  return patterns.some((pattern) => {
    const p = pattern.toLowerCase();
    if (p.endsWith('*')) {
      return lower.startsWith(p.slice(0, -1));
    }
    return lower === p;
  });
}

function resolveTypeKey(mapping: EcsFieldMapping, value: string): string {
  if (mapping.strategy === 'ip') {
    return getIPType(value) === 'IPV4' ? OBSERVABLE_TYPE_IPV4.key : OBSERVABLE_TYPE_IPV6.key;
  }
  return mapping.typeKey;
}

function castToArray(value: string | string[] | null | undefined): string[] {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

export class EntityExtractionService {
  private readonly logger: Logger;
  private readonly fieldIndex: Map<string, EcsFieldMapping>;
  private readonly exclusionFilters: Record<string, string[]>;
  private readonly description: string;

  constructor(logger: Logger, config: ExtractionConfig = {}) {
    this.logger = logger;
    const mappings = config.fieldMappings ?? DEFAULT_ECS_FIELD_MAPPINGS;
    this.fieldIndex = buildFieldMappingIndex(mappings);
    this.exclusionFilters = config.exclusionFilters ?? {};
    this.description = config.description ?? DEFAULT_DESCRIPTION;
  }

  /**
   * Extract observables from a single alert's flattened ECS data.
   */
  extractFromAlert(ecsData: EcsFieldEntry[]): ObservablePost[] {
    const result = this.processBatch([ecsData]);
    return result.observables;
  }

  /**
   * Extract and deduplicate observables from multiple alerts.
   * Designed for the automated pipeline where many alerts are
   * grouped into a single case.
   */
  bulkExtract(alertsEcsData: EcsFieldEntry[][]): BulkExtractionResult {
    return this.processBatch(alertsEcsData);
  }

  private processBatch(alertsEcsData: EcsFieldEntry[][]): BulkExtractionResult {
    const observablesMap = new Map<string, ObservablePost>();
    let fieldsInspected = 0;
    let excluded = 0;

    for (const ecsData of alertsEcsData) {
      for (const entry of ecsData) {
        const values = castToArray(entry.value);
        const mapping = values.length > 0 ? this.fieldIndex.get(entry.field) : undefined;

        if (mapping) {
          for (const rawValue of values) {
            fieldsInspected++;
            const value = rawValue?.trim();

            if (value) {
              const typeKey = resolveTypeKey(mapping, value);
              const exclusions = this.exclusionFilters[typeKey];

              if (exclusions && matchesExclusion(value, exclusions)) {
                excluded++;
                this.logger.debug(`[EntityExtraction] Excluded ${typeKey}="${value}" by filter`);
              } else {
                const dedupKey = `${typeKey}-${value}`;
                if (!observablesMap.has(dedupKey)) {
                  observablesMap.set(dedupKey, {
                    typeKey,
                    value,
                    description: this.description,
                  });
                }
              }
            }
          }
        }
      }
    }

    return {
      observables: Array.from(observablesMap.values()),
      processedAlerts: alertsEcsData.length,
      fieldsInspected,
      excluded,
    };
  }
}
