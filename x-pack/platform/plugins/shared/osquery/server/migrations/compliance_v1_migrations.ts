/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectMigrationFn, SavedObjectUnsanitizedDoc } from '@kbn/core/server';

/**
 * Migrations for osquery-compliance-rule saved object type
 * Handles schema changes and data transformations across versions
 */

/**
 * Migration: Add schema_version field to all compliance rules
 * Version: 8.16.0
 */
export const addSchemaVersionToRules: SavedObjectMigrationFn<
  Record<string, unknown>,
  Record<string, unknown>
> = (doc) => {
  return {
    ...doc,
    attributes: {
      ...doc.attributes,
      schema_version: 1,
    },
  };
};

/**
 * Migration: Add version metadata to benchmark field
 * Version: 8.16.0
 */
export const addBenchmarkVersionMetadata: SavedObjectMigrationFn<
  Record<string, unknown>,
  Record<string, unknown>
> = (doc) => {
  const benchmark = doc.attributes.benchmark as any;

  if (benchmark && !benchmark.version) {
    return {
      ...doc,
      attributes: {
        ...doc.attributes,
        benchmark: {
          ...benchmark,
          version: '1.0.0', // Default version for legacy rules
          posture_type: benchmark.posture_type || 'endpoint',
        },
      },
    };
  }

  return doc;
};

/**
 * Migration: Convert interval from minutes to seconds
 * Version: 8.16.0
 * Reason: Standardize interval units across osquery
 */
export const normalizeQueryInterval: SavedObjectMigrationFn<
  Record<string, unknown>,
  Record<string, unknown>
> = (doc) => {
  const interval = doc.attributes.interval as number;

  // If interval > 3600, assume it's in minutes (legacy format)
  // Convert to seconds
  if (interval && interval > 86400) {
    return {
      ...doc,
      attributes: {
        ...doc.attributes,
        interval: interval * 60, // minutes to seconds
        interval_unit: 'seconds',
      },
    };
  }

  return {
    ...doc,
    attributes: {
      ...doc.attributes,
      interval_unit: 'seconds',
    },
  };
};

/**
 * Migration: Add enabled field with default true
 * Version: 8.16.0
 */
export const addEnabledFieldToRules: SavedObjectMigrationFn<
  Record<string, unknown>,
  Record<string, unknown>
> = (doc) => {
  if (doc.attributes.enabled === undefined) {
    return {
      ...doc,
      attributes: {
        ...doc.attributes,
        enabled: true, // Default enabled for existing rules
      },
    };
  }

  return doc;
};

/**
 * Migration: Add tags array if missing
 * Version: 8.16.0
 */
export const ensureTagsArray: SavedObjectMigrationFn<
  Record<string, unknown>,
  Record<string, unknown>
> = (doc) => {
  if (!Array.isArray(doc.attributes.tags)) {
    return {
      ...doc,
      attributes: {
        ...doc.attributes,
        tags: [],
      },
    };
  }

  return doc;
};

/**
 * Migration: Add prebuilt flag to distinguish CIS rules from custom
 * Version: 8.16.0
 */
export const addPrebuiltFlag: SavedObjectMigrationFn<
  Record<string, unknown>,
  Record<string, unknown>
> = (doc) => {
  const ruleId = doc.attributes.rule_id as string;

  // Rules starting with "cis-" are prebuilt
  const isPrebuilt = ruleId?.startsWith('cis-') || ruleId?.startsWith('pci-');

  return {
    ...doc,
    attributes: {
      ...doc.attributes,
      prebuilt: isPrebuilt,
    },
  };
};

/**
 * Migration: Add created_at and updated_at timestamps
 * Version: 8.16.0
 */
export const addTimestamps: SavedObjectMigrationFn<
  Record<string, unknown>,
  Record<string, unknown>
> = (doc) => {
  const now = new Date().toISOString();

  return {
    ...doc,
    attributes: {
      ...doc.attributes,
      created_at: doc.attributes.created_at || doc.updated_at || now,
      updated_at: doc.updated_at || now,
    },
  };
};

/**
 * Migrations for osquery-compliance-exception saved object type
 */

/**
 * Migration: Add status field to exceptions
 * Version: 8.16.0
 */
export const addStatusToExceptions: SavedObjectMigrationFn<
  Record<string, unknown>,
  Record<string, unknown>
> = (doc) => {
  const endDate = (doc.attributes.time_scope as any)?.end_date;
  const now = new Date();

  let status = 'active';

  if (endDate && new Date(endDate) < now) {
    status = 'expired';
  }

  if (doc.attributes.enabled === false) {
    status = 'disabled';
  }

  return {
    ...doc,
    attributes: {
      ...doc.attributes,
      status,
    },
  };
};

/**
 * Migration: Normalize exception scope structure
 * Version: 8.16.0
 */
export const normalizeExceptionScope: SavedObjectMigrationFn<
  Record<string, unknown>,
  Record<string, unknown>
> = (doc) => {
  const scope = doc.attributes.scope as any;

  if (!scope || typeof scope !== 'object') {
    return {
      ...doc,
      attributes: {
        ...doc.attributes,
        scope: {
          type: 'global',
        },
      },
    };
  }

  // Ensure scope has required fields
  if (!scope.type) {
    return {
      ...doc,
      attributes: {
        ...doc.attributes,
        scope: {
          ...scope,
          type: 'global',
        },
      },
    };
  }

  return doc;
};

/**
 * Migration: Add audit trail metadata
 * Version: 8.16.0
 */
export const addAuditMetadataToExceptions: SavedObjectMigrationFn<
  Record<string, unknown>,
  Record<string, unknown>
> = (doc) => {
  const now = new Date().toISOString();

  return {
    ...doc,
    attributes: {
      ...doc.attributes,
      created_at: doc.attributes.created_at || doc.updated_at || now,
      created_by: doc.attributes.created_by || 'system',
      audit_trail: doc.attributes.audit_trail || [
        {
          action: 'created',
          timestamp: doc.attributes.created_at || now,
          user: doc.attributes.created_by || 'system',
        },
      ],
    },
  };
};

/**
 * Complete migration map for plugin registration
 */
export const complianceMigrations = {
  '8.16.0': (doc: SavedObjectUnsanitizedDoc) => {
    if (doc.type === 'osquery-compliance-rule') {
      let migrated = doc;
      migrated = addSchemaVersionToRules(migrated);
      migrated = addBenchmarkVersionMetadata(migrated);
      migrated = normalizeQueryInterval(migrated);
      migrated = addEnabledFieldToRules(migrated);
      migrated = ensureTagsArray(migrated);
      migrated = addPrebuiltFlag(migrated);
      migrated = addTimestamps(migrated);
      return migrated;
    }

    if (doc.type === 'osquery-compliance-exception') {
      let migrated = doc;
      migrated = addStatusToExceptions(migrated);
      migrated = normalizeExceptionScope(migrated);
      migrated = addAuditMetadataToExceptions(migrated);
      return migrated;
    }

    return doc;
  },
};
