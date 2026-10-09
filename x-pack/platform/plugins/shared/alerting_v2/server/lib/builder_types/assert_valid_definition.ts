/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import {
  MAX_BUILDER_FIELDS_ARRAY_ITEMS,
  MAX_BUILDER_FIELDS_BYTES,
  MAX_BUILDER_FIELDS_STRING_LENGTH,
} from '@kbn/alerting-v2-constants';
import { MAX_BUILDER_TYPE_LENGTH } from '@kbn/alerting-v2-schemas';
import type { MappingProperty } from '@kbn/alerting-v2-rule-builders';
import { assertBoundedSchema } from '../bounded_schema';
import type { FoldedVersionsRecord } from './folded_versions';
import type { RegisteredBuilderType } from './types';

/**
 * A valid type id consists of dot-separated segments, each containing only
 * lowercase ASCII letters, digits, and underscores.
 */
const TYPE_ID_PATTERN = /^[a-z0-9_]+(\.[a-z0-9_]+)*$/;

/** The bounds subject passed to assertBoundedSchema. */
const BUILDER_FIELDS_SUBJECT = {
  kind: 'Builder type',
  schemaProperty: 'builderFieldsSchema',
  rootPath: 'builder_fields',
  limits: {
    stringLength: MAX_BUILDER_FIELDS_STRING_LENGTH,
    arrayItems: MAX_BUILDER_FIELDS_ARRAY_ITEMS,
    totalBytes: MAX_BUILDER_FIELDS_BYTES,
  },
  // Enable the builder-type-specific extensions to the bounded-schema check:
  // no-defaults/no-transforms rule and the top-level 64-key cap.
  builderChecks: true,
} as const;

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Asserts that a builder type definition is valid.
 *
 * Runs the eight registration-time checks from the builder-type-registration
 * redesign, in order, so a violating definition fails on its first violated
 * check. Check 1 (setup-phase-only, no duplicate id) is enforced in
 * BuilderTypeRegistry before this function is called.
 *
 * The eight designed checks and their positions in this function:
 *   2. Id format                          — explicit guard below
 *   3. Bounded schema                     — delegated to assertBoundedSchema
 *   4. Top-level key count                — inside assertBoundedSchema (builderChecks)
 *   5. No defaults, no transforms         — inside assertBoundedSchema (builderChecks)
 *   6. Total mapping                      — assertTotalMapping below
 *   7. Managed-type completeness          — assertManagedTypeCompleteness below
 *   8. Compilation-mode consistency       — explicit guard below
 *
 * The following are structural guards (not one of the eight), kept because
 * they enable the numbered checks to run meaningfully or because the check
 * falls outside the eight's scope:
 *   - Non-empty type string
 *   - Present builderFieldsSchema and generateQuery
 *   - Kind-pin value check (if kind is declared it must be a known RuleKind)
 *
 * @param definition - The type definition to validate.
 * @param foldedVersions - Record of folded manifests and (type, version) pairs.
 *   Consulted by check 6 (total mapping) and check 7 (managed-type
 *   completeness). Step B.5 populates the production singleton; tests pass a
 *   fixture via BuilderTypeRegistry.withFoldedVersions().
 */
export function assertValidDefinition(
  definition: RegisteredBuilderType,
  foldedVersions: FoldedVersionsRecord
): void {
  // ---------------------------------------------------------------------------
  // Structural guards (not one of the eight designed checks)
  // ---------------------------------------------------------------------------

  if (typeof definition.type !== 'string' || definition.type.trim().length === 0) {
    throw new Error('Builder type definition requires a non-empty type');
  }

  if (definition.builderFieldsSchema == null) {
    throw new Error(`Builder type "${definition.type}" requires a builderFieldsSchema`);
  }

  if (typeof definition.generateQuery !== 'function') {
    throw new Error(`Builder type "${definition.type}" requires a generateQuery function`);
  }

  // Kind-pin value check: if `kind` is declared it must be a known RuleKind.
  // This is a structural guard: the range of valid kind values is small and
  // fixed, and an invalid kind would fail writes silently. Not part of the
  // eight designed checks.
  if (definition.kind !== undefined) {
    if (definition.kind !== 'alert' && definition.kind !== 'signal') {
      throw new Error(
        `Builder type "${definition.type}" has an invalid kind pin "${String(
          definition.kind
        )}" — must be 'alert' or 'signal' (kind pin validity check)`
      );
    }
  }

  // ---------------------------------------------------------------------------
  // Check 2: id format
  // Lowercase letters, digits, underscores; dot-separated segments; <= 64 chars.
  // Ref: builder-type-registration-redesign.md "Registration-time checks" row 2
  // ---------------------------------------------------------------------------

  if (definition.type.length > MAX_BUILDER_TYPE_LENGTH) {
    throw new Error(
      `Builder type "${definition.type}" id exceeds the maximum length of ` +
        `${MAX_BUILDER_TYPE_LENGTH} characters (id format check)`
    );
  }
  if (!TYPE_ID_PATTERN.test(definition.type)) {
    throw new Error(
      `Builder type "${definition.type}" id must consist of dot-separated segments ` +
        `of lowercase letters, digits, and underscores (id format check)`
    );
  }

  // ---------------------------------------------------------------------------
  // Checks 3, 4, 5: bounded schema / top-level key count / no defaults or transforms
  // The bounded-schema walk (check 3) is extended, via builderChecks: true, with
  // the top-level key count (check 4) and the no-defaults/no-transforms rule
  // (check 5). All three are delegated to assertBoundedSchema.
  // Ref: builder-type-registration-redesign.md "Registration-time checks" rows 3-5
  // ---------------------------------------------------------------------------

  assertBoundedSchema(definition.builderFieldsSchema, definition.type, BUILDER_FIELDS_SUBJECT);

  // ---------------------------------------------------------------------------
  // Check 6: total mapping
  // Every leaf the schema can produce must have a compatible sub-field in the
  // currentMappings of the folded manifest that covers this type. A sub-field
  // with no leaf behind it is allowed (abandoned field). For a string leaf on a
  // keyword sub-field the schema's bound must not exceed the sub-field's
  // ignore_above.
  // Ref: builder-type-registration-redesign.md "Registration-time checks" row 6
  //      builder-type-registration-redesign.md "The sub-field mappings"
  // ---------------------------------------------------------------------------

  assertTotalMapping(definition, foldedVersions);

  // ---------------------------------------------------------------------------
  // Check 7: managed-type completeness
  // A type with `ownership` must be covered by a folded manifest, must declare
  // `compilation` explicitly, and must have an id whose first two dot-segments
  // equal the declared solution and domain.
  // Ref: builder-type-registration-redesign.md "Registration-time checks" row 7
  // ---------------------------------------------------------------------------

  if (definition.ownership !== undefined) {
    assertManagedTypeCompleteness(definition, foldedVersions);
  }

  // ---------------------------------------------------------------------------
  // Check 8: compilation-mode consistency
  // `deriveRuleFields` and `enrichRuleEvent` are only allowed on execution-time
  // types. For write-time types the stored fields are raw JSON that has never
  // passed through `builderFieldsSchema`, so the hook contract cannot be satisfied.
  // Ref: builder-type-registration-redesign.md "Registration-time checks" row 8
  //      rule-execution-logic.md "Derived rule fields at write time"
  //      rule-event-generation-logic.md "The hook contract"
  // ---------------------------------------------------------------------------

  if (definition.deriveRuleFields !== undefined && definition.compilation !== 'execution_time') {
    throw new Error(
      `Builder type "${definition.type}" declares deriveRuleFields but compilation is not ` +
        `'execution_time' — deriveRuleFields is only allowed on execution-time types ` +
        `(mode consistency check)`
    );
  }

  if (definition.enrichRuleEvent !== undefined && definition.compilation !== 'execution_time') {
    throw new Error(
      `Builder type "${definition.type}" declares enrichRuleEvent but compilation is not ` +
        `'execution_time' — enrichRuleEvent is only allowed on execution-time types ` +
        `(mode consistency check)`
    );
  }
}

// ---------------------------------------------------------------------------
// Check 6 helpers: total mapping
// ---------------------------------------------------------------------------

/**
 * Schema-leaf types the total-mapping check recognises. A JSON Schema node
 * that carries none of these is either a container (object/array) or a
 * combinator (anyOf/oneOf), neither of which has a stored ES sub-field.
 */
type LeafSchemaType = 'string' | 'integer' | 'number' | 'boolean';

/**
 * Compatibility table: which ES sub-field types are accepted for each schema
 * leaf type.
 *
 * string  -> keyword | text | ip | date
 * integer -> integer | long | short | byte | unsigned_long
 * number  -> double  | float | half_float | scaled_float
 * boolean -> boolean
 *
 * Ref: builder-type-registration-redesign.md "Registration-time checks" row 6
 */
const COMPATIBLE_SUB_FIELD_TYPES: Record<LeafSchemaType, ReadonlyArray<MappingProperty['type']>> = {
  string: ['keyword', 'text', 'ip', 'date'],
  integer: ['integer', 'long', 'short', 'byte', 'unsigned_long'],
  number: ['double', 'float', 'half_float', 'scaled_float'],
  boolean: ['boolean'],
};

/**
 * Returns the effective character bound for a string JSON-Schema node.
 *
 * Regular strings carry `maxLength`. Zod enums (`z.enum([...])`) emit a
 * `type: 'string'` node with an `enum` array and no `maxLength`. For those
 * the bound is the length of the longest enum value, because no stored value
 * can be longer than that.
 *
 * This is the one place where the check is most likely to be quietly wrong:
 * `severity` and `language` are Zod enums with no `.max()`, so their JSON
 * Schema carries `enum` and no `maxLength`. Reading `maxLength` alone would
 * treat both as unbounded. The enum branch corrects that.
 *
 * Returns `undefined` when neither source is present (the string is declared
 * unbounded at the JSON-Schema level, which assertBoundedSchema already
 * rejects before this function is called).
 */
function getStringBound(node: Record<string, unknown>): number | undefined {
  // Regular bounded string.
  if (typeof node.maxLength === 'number') {
    return node.maxLength;
  }
  // Enum string: longest value is the effective maximum.
  if (Array.isArray(node.enum)) {
    const stringValues = (node.enum as unknown[]).filter((v): v is string => typeof v === 'string');
    if (stringValues.length > 0) {
      return Math.max(...stringValues.map((v) => v.length));
    }
  }
  return undefined;
}

/**
 * Checks one schema leaf against the manifest's currentMappings. Throws when:
 *   - the leaf path is not in currentMappings (unmapped leaf), or
 *   - the sub-field's type is incompatible with the schema leaf's type, or
 *   - the leaf is a string on a keyword sub-field whose ignore_above is below
 *     the schema's bound (a value the schema accepts could be silently dropped
 *     by Elasticsearch's keyword indexer).
 *
 * A text sub-field gets no bound check because Elasticsearch imposes no length
 * limit on an analyzed field; numeric, boolean, date, and ip sub-fields carry
 * no bound to compare.
 */
function assertLeafMapping(
  relPath: string,
  schemaType: LeafSchemaType,
  node: Record<string, unknown>,
  typeName: string,
  currentMappings: Record<string, MappingProperty>
): void {
  const mapping = currentMappings[relPath];
  if (mapping === undefined) {
    throw new Error(
      `Builder type "${typeName}" field "${relPath}": the schema produces this leaf ` +
        `but no sub-field is declared for it in the manifest's currentMappings — ` +
        `add the leaf to the manifest (total mapping check)`
    );
  }

  const accepted = COMPATIBLE_SUB_FIELD_TYPES[schemaType];
  if (!accepted.includes(mapping.type as MappingProperty['type'])) {
    throw new Error(
      `Builder type "${typeName}" field "${relPath}": schema type "${schemaType}" is not ` +
        `compatible with sub-field type "${mapping.type}" — accepted sub-field types for ` +
        `"${schemaType}" are: ${accepted.join(', ')} (total mapping check)`
    );
  }

  // For a string leaf on a keyword sub-field, the schema's bound must not
  // exceed the sub-field's ignore_above. A text sub-field gets no bound check
  // because Elasticsearch imposes no length limit on an analyzed field.
  if (schemaType === 'string' && mapping.type === 'keyword') {
    const kwMapping = mapping as { type: 'keyword'; ignore_above: number };
    const bound = getStringBound(node);
    if (bound !== undefined && bound > kwMapping.ignore_above) {
      throw new Error(
        `Builder type "${typeName}" field "${relPath}": schema bound ${bound} exceeds ` +
          `the keyword sub-field's ignore_above ${kwMapping.ignore_above} — a value the ` +
          `schema accepts could be stored and never indexed by Elasticsearch's keyword ` +
          `indexer (total mapping check)`
      );
    }
  }
}

/**
 * Walks a JSON-Schema node to its leaves and calls assertLeafMapping for each
 * leaf whose type is string, integer, number, or boolean.
 *
 * The traversal mirrors walkForIgnoreAbove's rules (the old check-4 helper):
 *   - objects: recurse into each property, extending the path.
 *   - arrays: recurse into items without extending the path (flattened
 *     mappings use dot notation with no array marker).
 *   - anyOf/oneOf: recurse into every branch (handles optional fields and
 *     unions that Zod emits as anyOf).
 *   - leaf types: string, integer, number, boolean — call assertLeafMapping.
 *   - null and unrecognised nodes: silently skipped (null has no ES mapping,
 *     and assertBoundedSchema already rejected unsupported constructs).
 */
function walkForTotalMapping(
  node: Record<string, unknown>,
  relPath: string,
  typeName: string,
  currentMappings: Record<string, MappingProperty>
): void {
  const nodeType = node.type;

  // Leaf: string, integer, number, boolean.
  if (
    nodeType === 'string' ||
    nodeType === 'integer' ||
    nodeType === 'number' ||
    nodeType === 'boolean'
  ) {
    assertLeafMapping(relPath, nodeType as LeafSchemaType, node, typeName, currentMappings);
    return;
  }

  // Container: object — recurse into each property.
  if (nodeType === 'object' && node.properties && typeof node.properties === 'object') {
    for (const [key, child] of Object.entries(
      node.properties as Record<string, Record<string, unknown>>
    )) {
      const childPath = relPath ? `${relPath}.${key}` : key;
      walkForTotalMapping(child, childPath, typeName, currentMappings);
    }
    return;
  }

  // Container: array — recurse into items without advancing the path.
  // Flattened-field mappings use dot notation with no array bracket.
  if (
    nodeType === 'array' &&
    node.items !== undefined &&
    typeof node.items === 'object' &&
    !Array.isArray(node.items)
  ) {
    walkForTotalMapping(node.items as Record<string, unknown>, relPath, typeName, currentMappings);
    return;
  }

  // Combinator: anyOf / oneOf — recurse into every branch.
  // Zod emits optional fields and union types as anyOf; empty branches ({}),
  // produced for the undefined/null arms, carry no type and are silently
  // skipped by the leaf guard above.
  const anyOf = node.anyOf ?? node.oneOf;
  if (Array.isArray(anyOf)) {
    for (const branch of anyOf as Record<string, unknown>[]) {
      walkForTotalMapping(branch, relPath, typeName, currentMappings);
    }
  }
}

/**
 * Runs the total-mapping check (check 6).
 *
 * Looks up the folded manifest that covers this type. If no manifest covers
 * it, the check is skipped — an unmanaged type without a manifest is not
 * expected to have typed sub-fields, and managed types without a covering
 * manifest are caught by check 7. When a manifest is found, walks the
 * schema to its leaves and asserts each one has a compatible sub-field in
 * the manifest's currentMappings.
 */
function assertTotalMapping(
  definition: RegisteredBuilderType,
  foldedVersions: FoldedVersionsRecord
): void {
  const manifest = foldedVersions.getManifestForType(definition.type);
  if (manifest === undefined) {
    // No manifest covers this type; skip the total-mapping check.
    // Managed types that lack manifest coverage are rejected by check 7.
    return;
  }

  const { currentMappings } = manifest;

  let json: Record<string, unknown>;
  try {
    json = z.toJSONSchema(definition.builderFieldsSchema, { io: 'input' }) as Record<
      string,
      unknown
    >;
  } catch {
    // assertBoundedSchema (checks 3-5) already surfaces JSON-Schema conversion
    // errors; reaching here means something unexpected happened, so bail out.
    return;
  }

  walkForTotalMapping(json, '', definition.type, currentMappings);
}

// ---------------------------------------------------------------------------
// Check 7 helper: managed-type completeness
// ---------------------------------------------------------------------------

/**
 * Runs the managed-type completeness check (check 7).
 *
 * A type with `ownership` must:
 *   1. Declare `compilation` explicitly.
 *   2. Be covered by a folded manifest (looked up via foldedVersions.getManifestForType).
 *   3. Have a type id whose first two dot-segments equal the declared solution
 *      and domain.
 *
 * The old clause that required a `manifest` property on the definition itself
 * is gone. Storage reaches the framework via the shared builder-fields package
 * and the fromBuilderFieldsManifest() fold lines, not through the registration.
 * The `manifest` property on BuilderTypeDefinition is ignored by every check
 * from here on; step B.10 removes it from the interface entirely.
 */
function assertManagedTypeCompleteness(
  definition: RegisteredBuilderType,
  foldedVersions: FoldedVersionsRecord
): void {
  const { type, ownership } = definition;
  // assertValidDefinition only calls this when ownership !== undefined.
  const o = ownership!;

  // Must declare compilation explicitly.
  if (definition.compilation === undefined) {
    throw new Error(
      `Builder type "${type}" declares ownership but does not declare compilation explicitly — ` +
        `managed types must declare compilation (managed-type completeness check)`
    );
  }

  // Must be covered by a folded manifest. The manifest carries the type's
  // sub-field mappings and version history; a managed type without coverage
  // would have no storage declaration in alerting_v2's build.
  if (foldedVersions.getManifestForType(type) === undefined) {
    throw new Error(
      `Builder type "${type}" declares ownership but no folded manifest covers it — ` +
        `add the type to a BuilderFieldsManifest's builderTypes and fold the manifest ` +
        `via fromBuilderFieldsManifest() in rule_model_versions.ts ` +
        `(managed-type completeness check)`
    );
  }

  // The type id's first two dot-segments must equal solution and domain.
  const segments = type.split('.');
  if (segments.length < 3 || segments[0] !== o.solution || segments[1] !== o.domain) {
    throw new Error(
      `Builder type "${type}" declares ownership { solution: "${o.solution}", domain: "${o.domain}" } ` +
        `but its id's first two segments ("${segments[0]}", "${
          segments[1] ?? ''
        }") do not match — ` +
        `a managed type's id must start with "<solution>.<domain>." ` +
        `(managed-type completeness check)`
    );
  }
}
