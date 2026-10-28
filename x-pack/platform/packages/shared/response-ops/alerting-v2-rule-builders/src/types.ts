/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z } from '@kbn/zod/v4';
import type { Query, RuleKind } from '@kbn/alerting-v2-schemas';

export type OpaqueBuilderFields = Record<string, unknown>;

export interface GeneratedQuery {
  query: Query;
  grouping?: { fields: string[] };
  time_field?: string;
}

// ---------------------------------------------------------------------------
// Keyword sub-field ceiling constants
//
// Every keyword sub-field under metadata.builder_fields must carry an
// ignore_above equal to KEYWORD_SUB_FIELD_IGNORE_ABOVE. The derivation is:
// Lucene refuses a single term that exceeds 32,766 bytes, and one UTF-8
// character takes at most four bytes, so 32,766 / 4 = 8,191.5 rounded down
// gives the largest character count that cannot exceed the byte limit whatever
// the content.
// ---------------------------------------------------------------------------

/** Lucene's hard limit on a single term, in bytes. A document write fails when any term exceeds it. */
export const LUCENE_MAX_TERM_BYTES = 32_766;

/** The widest UTF-8 encoding of one character, the figure the Elasticsearch reference uses. */
export const MAX_UTF8_BYTES_PER_CHAR = 4;

/**
 * The `ignore_above` value every keyword sub-field of metadata.builder_fields must carry:
 * the largest character count whose worst-case UTF-8 encoding still fits inside one Lucene
 * term, so no value the sub-field accepts can cause a document write to fail.
 * 32,766 / 4 = 8,191.5, rounded down to 8,191.
 */
export const KEYWORD_SUB_FIELD_IGNORE_ABOVE = Math.floor(
  LUCENE_MAX_TERM_BYTES / MAX_UTF8_BYTES_PER_CHAR
);

// ---------------------------------------------------------------------------
// Mapping property type
// ---------------------------------------------------------------------------

/**
 * The leaf field types allowed as typed sub-fields of the metadata.builder_fields
 * flattened container.
 *
 * Keyword sub-fields require ignore_above so that every value the schema accepts
 * stays under Lucene's 32,766-byte term limit. Text sub-fields carry no such bound;
 * Elasticsearch imposes none, and the schema's own .max() is the limit that bites.
 * Numerics, boolean, date, and ip are indexed and sorted by their natural type.
 * scaled_float requires a scaling_factor.
 */
export type MappingProperty =
  | { type: 'keyword'; ignore_above: number }
  | { type: 'text' }
  | { type: 'integer' | 'long' | 'short' | 'byte' | 'unsigned_long' }
  | { type: 'double' | 'float' | 'half_float' }
  | { type: 'scaled_float'; scaling_factor: number }
  | { type: 'boolean' }
  | { type: 'date' }
  | { type: 'ip' };

// ---------------------------------------------------------------------------
// Builder-fields manifest types (new storage contract)
// ---------------------------------------------------------------------------

/**
 * Declares the storage that one contributing solution owns inside the
 * metadata.builder_fields flattened container. One manifest covers every
 * builder type a solution contributes, because the sub-field properties
 * table is shared across all of them.
 *
 * The two halves are intentionally separate. currentMappings is the live
 * declaration used to build the static mapping. versions is the immutable
 * history used by the migration machinery. A version's addedMappings are
 * always literals, never derived from currentMappings, so that a later
 * change to currentMappings cannot alter what a deployed version recorded.
 */
export interface BuilderFieldsManifest {
  /** The builder types whose rules this manifest declares storage for. */
  builderTypes: string[];

  /**
   * Every typed sub-field under metadata.builder_fields that these types index
   * today, keyed by leaf path in dot notation. Placed directly into the container's
   * properties. Must equal the merge of every version's addedMappings.
   */
  currentMappings: Record<string, MappingProperty>;

  /** The highest key in `versions`. Must equal the key count when versions are dense from 1. */
  currentVersion: number;

  /**
   * Dense from 1, append-only. A published version is never edited, because the migration
   * that folded it has already run on some deployments.
   */
  versions: Record<number, BuilderFieldsVersion>;
}

/**
 * What one released version of the builder-fields manifest contributes to the
 * alerting_rule saved-object type. Both properties are optional; a version may
 * add mappings, rewrite stored builder fields, or both.
 */
export interface BuilderFieldsVersion {
  /**
   * Typed sub-fields this version adds under metadata.builder_fields, keyed by
   * leaf path in dot notation. Always literals, never a reference to the
   * currentMappings object, so that a later edit to currentMappings cannot change
   * what a deployed version recorded.
   */
  addedMappings?: Record<string, MappingProperty>;

  /**
   * Scoped rewrites of stored builder fields. Each entry names the builder types
   * it applies to, and a given builder type appears in at most one entry per version.
   */
  backfills?: BuilderFieldsBackfill[];
}

/**
 * One scoped backfill inside a BuilderFieldsVersion. The framework calls migrate
 * only for rules whose stored metadata.builder_type matches one of the listed
 * builderTypes. The function is pure: no I/O, no registry access, no framework
 * services.
 */
export interface BuilderFieldsBackfill {
  /** Rules of these builder types are rewritten; rules of any other type are not. */
  builderTypes: string[];

  /** Pure over the rule's builder_fields: takes the container and returns the container. */
  migrate: (fields: OpaqueBuilderFields) => OpaqueBuilderFields;
}

// ---------------------------------------------------------------------------
// mergeBuilderFieldMappings
// ---------------------------------------------------------------------------

/**
 * Merges one or more builder-field mapping records into a single record.
 *
 * When two sources declare the same leaf path with identical mappings the
 * declarations merge silently — identical means structurally equal over every
 * key, ignore_above included. When two sources declare the same path with
 * differing mappings an error is thrown, naming the conflicting path and both
 * declarations. This runs when the module loads, so a conflict surfaces in every
 * test and every boot rather than only on a specific deployment.
 *
 * @param sources One or more leaf-path-keyed mapping records to merge.
 * @returns The merged record; a new object, not a mutation of any source.
 * @throws {Error} When two sources declare the same path with different mappings.
 */
export function mergeBuilderFieldMappings(
  ...sources: Array<Record<string, MappingProperty>>
): Record<string, MappingProperty> {
  const result: Record<string, MappingProperty> = {};
  for (const source of sources) {
    for (const [path, mapping] of Object.entries(source)) {
      if (Object.prototype.hasOwnProperty.call(result, path)) {
        if (!isMappingPropertyEqual(result[path], mapping)) {
          throw new Error(
            `Builder field mapping conflict at path "${path}": ` +
              `source A declares ${JSON.stringify(sortObjectKeys(result[path]))}, ` +
              `source B declares ${JSON.stringify(sortObjectKeys(mapping))}. ` +
              `Identical declarations merge silently; differing declarations do not.`
          );
        }
        // Identical — keep the existing entry, nothing to do.
      } else {
        result[path] = mapping;
      }
    }
  }
  return result;
}

/** Structural equality over all keys. Serialises with sorted keys so key insertion order is irrelevant. */
function isMappingPropertyEqual(a: MappingProperty, b: MappingProperty): boolean {
  return JSON.stringify(sortObjectKeys(a)) === JSON.stringify(sortObjectKeys(b));
}

/** Returns a new object whose own enumerable entries are sorted by key. Shallow only. */
function sortObjectKeys(obj: object): object {
  return Object.fromEntries(Object.entries(obj).sort(([ka], [kb]) => ka.localeCompare(kb)));
}

// ---------------------------------------------------------------------------
// Compilation contract types
// ---------------------------------------------------------------------------

export interface QueryGenerationInput<TFields> {
  /** The parsed builder fields - the source of truth. */
  fields: TFields;

  /** Read-only framework fields of the rule being compiled. */
  rule: {
    /** Absent on the create path of write-time types; always present at execution time. */
    id?: string;
    kind: 'alert' | 'signal';
    schedule: { every: string; lookback?: string };
    time_field: string;
  };

  /** Present only for execution-time compilation. */
  run?: {
    /** The run's reference time; equals window.end under scheduled execution. */
    now: string;
    /** The time window the framework attaches as the request-level range filter. */
    window: { start: string; end: string };
  };
}

export type GenerateQuery<TFields> = (
  input: QueryGenerationInput<TFields>
) => GeneratedQuery | Promise<GeneratedQuery>;

// ---------------------------------------------------------------------------
// Derived rule fields (execution-time types only)
// ---------------------------------------------------------------------------

export interface DerivedRuleFields {
  time_field?: string;
  grouping?: { fields: string[] };
}

// ---------------------------------------------------------------------------
// Enrichment hook types
// ---------------------------------------------------------------------------

export interface RuleEventEnrichmentInput<TFields> {
  /** The parsed builder fields of the rule that produced the event. */
  fields: TFields;

  /** Read-only identity of the rule, as the run fetched it. */
  rule: {
    id: string;
    /** The rule's metadata.signature_id. */
    signature_id: string;
    kind: 'alert' | 'signal';
  };

  /** The ES|QL result row this event was built from - the event's `data`, pre-merge. */
  row: Readonly<Record<string, unknown>>;
}

export interface RuleEventEnrichment {
  /** Sets the event's mapped severity. Wins over a `severity` output column. */
  severity?: 'info' | 'low' | 'medium' | 'high' | 'critical';

  /** Merged over the row into the event's `data`; enrichment wins on key collisions. */
  data?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Builder type registration interface
// ---------------------------------------------------------------------------

export interface BuilderTypeDefinition<TFields extends object = OpaqueBuilderFields> {
  /** Unique id; also the stored value of metadata.builder_type. E.g. 'security.detection.query'. */
  type: string;

  /** Display name and description, for the Alerting UI's read-only listings and for docs. */
  name: string;
  description?: string;

  /** If set, rules of this type must use this kind; writes with another kind are rejected. */
  kind?: RuleKind;

  /**
   * If set, the type is managed: every rule of this type is stamped with this ownership
   * and the generic Alerting v2 API refuses all writes to it. Absent = unmanaged platform type.
   */
  ownership?: { solution: string; domain: string };

  /**
   * When generateQuery runs. 'write_time' compiles on create/update and persists the query
   * (today's behavior, the default). 'execution_time' compiles on every run and persists nothing.
   */
  compilation?: 'write_time' | 'execution_time';

  /** Bounded, strict, default-free Zod schema for metadata.builder_fields. */
  builderFieldsSchema: z.ZodType<TFields>;

  /** Optional cross-field validation beyond the schema; pure; runs on writes after the parse. */
  validateFields?: (fields: TFields) => string[];

  /**
   * For execution-time types only: pure; derives the persisted framework fields
   * (grouping, time_field) from the builder fields on every write.
   */
  deriveRuleFields?: (fields: TFields) => DerivedRuleFields;

  /** Compiles the fields into the rule's ES|QL query. Input and call site per compilation mode. */
  generateQuery: (input: QueryGenerationInput<TFields>) => GeneratedQuery | Promise<GeneratedQuery>;

  /** Optional per-event enrichment of the rule events a run produces. */
  enrichRuleEvent?: (input: RuleEventEnrichmentInput<TFields>) => RuleEventEnrichment;
}

export type RegisteredBuilderType = BuilderTypeDefinition<OpaqueBuilderFields>;

export const defineBuilderType = <TFields extends object>(
  definition: BuilderTypeDefinition<TFields>
): RegisteredBuilderType => definition as unknown as RegisteredBuilderType;
