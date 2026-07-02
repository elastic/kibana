/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Capability-manifest artifacts generated from the converted (joi→JSON) chart
 * schemas at module load, mirroring the `jsonSchemas` memo in schemas.ts:
 *
 * - capability index: one line per capability (`name — blurb`)
 * - schema fragments: self-contained subtrees (subtree + transitive `$ref`
 *   closure — the converted schemas are `$ref`/`$defs` based, e.g. XY)
 * - core schema: the full schema minus every capability-claimed subtree
 * - reverse lookups: validation-error path → owning capability, and
 *   config → "does it use capability X?"
 *
 * All functions are no-ops (undefined/false) for chart types without a
 * capability manifest in the chart type registry.
 */

import type { SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';
import type { CapabilitySelector, ChartCapability } from './chart_type_registry';
import { chartTypeRegistry } from './chart_type_registry';
import { getSchemaForChartType } from './schemas';

type JsonObject = Record<string, unknown>;

const REF_PREFIX = '#/$defs/';

const isObject = (value: unknown): value is JsonObject =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const asArray = (value: unknown): unknown[] | undefined =>
  Array.isArray(value) ? (value as unknown[]) : undefined;

/**
 * JSON round-trip clone. The converted joi schemas can carry function values
 * (e.g. dynamic defaults) that `structuredClone` rejects; since these
 * artifacts end up JSON-serialized into prompts anyway, dropping them here is
 * the correct behavior.
 */
const cloneAsJson = <T>(value: T): T => JSON.parse(JSON.stringify(value));

const refNameOf = (node: unknown): string | undefined => {
  if (!isObject(node) || typeof node.$ref !== 'string') return undefined;
  return node.$ref.startsWith(REF_PREFIX) ? node.$ref.slice(REF_PREFIX.length) : undefined;
};

const getDefs = (doc: JsonObject): Record<string, unknown> =>
  isObject(doc.$defs) ? doc.$defs : {};

/** Follows `$ref` chains until a non-ref node; returns the node and the def names visited. */
const deref = (doc: JsonObject, node: unknown): { node: unknown; refs: string[] } => {
  const defs = getDefs(doc);
  const refs: string[] = [];
  let current = node;
  let name = refNameOf(current);
  while (name !== undefined && !refs.includes(name)) {
    refs.push(name);
    current = defs[name];
    if (current === undefined) {
      throw new Error(`Unresolvable $ref "${name}" in converted schema`);
    }
    name = refNameOf(current);
  }
  return { node: current, refs };
};

interface NormalizedSelector {
  pointer: string;
  branch?: { key: string; value: string };
}

const normalizeSelector = (selector: CapabilitySelector): NormalizedSelector =>
  typeof selector === 'string' ? { pointer: selector } : selector;

interface ResolvedPointer {
  node: unknown;
  /** Config-instance flavored path segments (`*` for array items). */
  instanceSegments: string[];
  /** Object/key holding the final node, so callers can delete it. */
  parent?: { container: JsonObject; key: string };
}

/**
 * Navigates a JSON pointer through `properties`/`items` segments, resolving
 * `$ref`s transparently. Union (`anyOf`) members must be selected with a
 * branch discriminator, never by array index.
 */
const resolvePointer = (doc: JsonObject, pointer: string): ResolvedPointer => {
  const segments = pointer.split('/').filter((segment) => segment.length > 0);
  const instanceSegments: string[] = [];
  let parent: ResolvedPointer['parent'];
  let current: unknown = doc;
  let i = 0;
  while (i < segments.length) {
    const { node } = deref(doc, current);
    if (!isObject(node)) {
      throw new Error(`Pointer "${pointer}" walks through a non-object schema node`);
    }
    if (segments[i] === 'properties') {
      const name = segments[i + 1];
      const properties = node.properties;
      if (name === undefined || !isObject(properties) || !(name in properties)) {
        throw new Error(`Pointer "${pointer}" does not resolve: missing property "${name}"`);
      }
      parent = { container: properties, key: name };
      current = properties[name];
      instanceSegments.push(name);
      i += 2;
    } else if (segments[i] === 'items') {
      if (node.items === undefined) {
        throw new Error(`Pointer "${pointer}" does not resolve: node has no "items"`);
      }
      parent = { container: node, key: 'items' };
      current = node.items;
      instanceSegments.push('*');
      i += 1;
    } else {
      throw new Error(
        `Pointer "${pointer}" contains unsupported segment "${segments[i]}": only ` +
          `"properties"/"items" navigation is allowed — select union branches with a ` +
          `branch discriminator, never by index`
      );
    }
  }
  return { node: current, instanceSegments, parent };
};

/** True when the union member's `properties[key]` accepts the discriminator value. */
const branchAccepts = (
  doc: JsonObject,
  variant: unknown,
  branch: { key: string; value: string }
): boolean => {
  const { node } = deref(doc, variant);
  if (!isObject(node) || !isObject(node.properties)) return false;
  const discriminator = node.properties[branch.key];
  if (discriminator === undefined) return false;
  const { node: prop } = deref(doc, discriminator);
  if (!isObject(prop)) return false;
  if (prop.const !== undefined) return prop.const === branch.value;
  const consts = asArray(prop.anyOf);
  return consts !== undefined && consts.some((c) => isObject(c) && c.const === branch.value);
};

const resolveBranch = (
  doc: JsonObject,
  unionNode: unknown,
  pointer: string,
  branch: { key: string; value: string }
): unknown => {
  const { node } = deref(doc, unionNode);
  const variants = isObject(node) ? asArray(node.anyOf) ?? asArray(node.oneOf) : undefined;
  if (variants === undefined) {
    throw new Error(`Selector branch on "${pointer}" targets a node without anyOf/oneOf`);
  }
  const matches = variants.filter((variant) => branchAccepts(doc, variant, branch));
  if (matches.length !== 1) {
    throw new Error(
      `Selector branch { ${branch.key}: "${branch.value}" } on "${pointer}" matched ` +
        `${matches.length} union members, expected exactly 1`
    );
  }
  return matches[0];
};

interface ResolvedSelector {
  node: unknown;
  instanceSegments: string[];
  branch?: { key: string; value: string };
  /** Config-instance flavored display path (slash-separated segments, array items as `*`). */
  displayPath: string;
}

const resolveSelector = (doc: JsonObject, selector: CapabilitySelector): ResolvedSelector => {
  const { pointer, branch } = normalizeSelector(selector);
  const { node, instanceSegments } = resolvePointer(doc, pointer);
  const resolvedNode = branch ? resolveBranch(doc, node, pointer, branch) : node;
  const displayPath = `/${instanceSegments.join('/')}${
    branch ? `(${branch.key}=${branch.value})` : ''
  }`;
  return { node: resolvedNode, instanceSegments, branch, displayPath };
};

const collectRefNames = (node: unknown, into: Set<string>): void => {
  if (Array.isArray(node)) {
    node.forEach((item) => collectRefNames(item, into));
    return;
  }
  if (!isObject(node)) return;
  const name = refNameOf(node);
  if (name !== undefined) into.add(name);
  Object.values(node).forEach((value) => collectRefNames(value, into));
};

/** Transitive `$ref` closure of the given subtrees; empty when fully inlined. */
const refClosure = (doc: JsonObject, roots: unknown[]): Record<string, unknown> => {
  const defs = getDefs(doc);
  const names = new Set<string>();
  roots.forEach((root) => collectRefNames(root, names));
  const pending = [...names];
  for (let i = 0; i < pending.length; i++) {
    const name = pending[i];
    const def = defs[name];
    if (def === undefined) {
      throw new Error(`Unresolvable $ref "${name}" while computing fragment closure`);
    }
    const discovered = new Set<string>();
    collectRefNames(def, discovered);
    for (const found of discovered) {
      if (!names.has(found)) {
        names.add(found);
        pending.push(found);
      }
    }
  }
  return Object.fromEntries([...names].map((name) => [name, defs[name]]));
};

export interface CapabilitySchemaFragment {
  name: string;
  blurb: string;
  kind: 'data' | 'presentation';
  /** Config-instance flavored path → schema subtree owned at that path. */
  subtrees: Record<string, object>;
  /** `$defs` referenced (transitively) by the subtrees; empty when fully inlined. */
  defs: Record<string, object>;
}

const buildFragment = (
  doc: JsonObject,
  name: string,
  capability: ChartCapability
): CapabilitySchemaFragment => {
  const subtrees: Record<string, object> = {};
  const roots: unknown[] = [];
  for (const selector of capability.select) {
    const { node, displayPath } = resolveSelector(doc, selector);
    subtrees[displayPath] = cloneAsJson(node) as object;
    roots.push(node);
  }
  const defs = cloneAsJson(refClosure(doc, roots)) as Record<string, object>;
  return { name, blurb: capability.blurb, kind: capability.kind, subtrees, defs };
};

/**
 * True when the (deref'd) node no longer constrains anything: an object whose
 * properties were all claimed away, a union with no members left, or an array
 * of such nodes. Used to clean up the core schema after subtree deletion.
 */
const isEmptySchemaNode = (doc: JsonObject, node: unknown, seenRefs: Set<string>): boolean => {
  let current = node;
  const localRefs = new Set(seenRefs);
  let name = refNameOf(current);
  while (name !== undefined) {
    if (localRefs.has(name)) return false;
    localRefs.add(name);
    current = getDefs(doc)[name];
    name = refNameOf(current);
  }
  if (!isObject(current)) return false;
  const variants = asArray(current.anyOf) ?? asArray(current.oneOf);
  if (variants !== undefined) {
    return variants.every((variant) => isEmptySchemaNode(doc, variant, localRefs));
  }
  if (isObject(current.properties)) {
    return Object.values(current.properties).every((property) =>
      isEmptySchemaNode(doc, property, localRefs)
    );
  }
  if (current.items !== undefined) {
    return isEmptySchemaNode(doc, current.items, localRefs);
  }
  return false;
};

/** Removes properties and union members that became empty after subtree deletion. */
const stripEmptyMembers = (doc: JsonObject, node: unknown, visited: Set<unknown>): void => {
  if (Array.isArray(node)) {
    node.forEach((item) => stripEmptyMembers(doc, item, visited));
    return;
  }
  if (!isObject(node) || visited.has(node)) return;
  visited.add(node);
  if (isObject(node.properties)) {
    for (const [key, value] of Object.entries(node.properties)) {
      if (isEmptySchemaNode(doc, value, new Set())) {
        delete node.properties[key];
      }
    }
  }
  for (const unionKey of ['anyOf', 'oneOf'] as const) {
    const variants = asArray(node[unionKey]);
    if (variants !== undefined) {
      const kept = variants.filter((variant) => !isEmptySchemaNode(doc, variant, new Set()));
      if (kept.length !== variants.length) {
        node[unionKey] = kept;
      }
    }
  }
  Object.values(node).forEach((value) => stripEmptyMembers(doc, value, visited));
};

const deleteSelector = (doc: JsonObject, selector: CapabilitySelector): void => {
  const { pointer, branch } = normalizeSelector(selector);
  const { node, parent } = resolvePointer(doc, pointer);
  if (branch) {
    const { node: union } = deref(doc, node);
    const variants = isObject(union) ? asArray(union.anyOf) ?? asArray(union.oneOf) : undefined;
    if (variants === undefined) {
      throw new Error(`Selector branch on "${pointer}" targets a node without anyOf/oneOf`);
    }
    const target = resolveBranch(doc, node, pointer, branch);
    variants.splice(variants.indexOf(target), 1);
    return;
  }
  if (parent === undefined) {
    throw new Error(`Cannot delete the schema root (selector "${pointer}")`);
  }
  delete parent.container[parent.key];
};

/** Full schema minus every capability-claimed subtree, with unused `$defs` pruned. */
const buildCoreSchema = (
  doc: JsonObject,
  capabilities: Record<string, ChartCapability>
): object => {
  const core = cloneAsJson(doc);
  for (const capability of Object.values(capabilities)) {
    for (const selector of capability.select) {
      deleteSelector(core, selector);
    }
  }
  stripEmptyMembers(core, core, new Set());
  if (isObject(core.$defs)) {
    const { $defs, ...rootWithoutDefs } = core;
    core.$defs = refClosure(core, [rootWithoutDefs]);
  }
  return core;
};

interface CompiledMatcher {
  name: string;
  selectors: Array<Pick<ResolvedSelector, 'instanceSegments' | 'branch'>>;
}

interface CompiledManifest {
  capabilities: Record<string, ChartCapability>;
  coreSelectors: CapabilitySelector[];
  index: string;
  fragments: Record<string, CapabilitySchemaFragment>;
  core: object;
  matchers: CompiledMatcher[];
}

const compileManifest = (
  chartType: SupportedChartType,
  capabilities: Record<string, ChartCapability>,
  coreSelectors: CapabilitySelector[]
): CompiledManifest => {
  const doc = getSchemaForChartType(chartType) as JsonObject;
  const fragments: Record<string, CapabilitySchemaFragment> = {};
  const matchers: CompiledMatcher[] = [];
  for (const [name, capability] of Object.entries(capabilities)) {
    fragments[name] = buildFragment(doc, name, capability);
    matchers.push({
      name,
      selectors: capability.select.map((selector) => {
        const { instanceSegments, branch } = resolveSelector(doc, selector);
        return { instanceSegments, branch };
      }),
    });
  }
  // Core selectors only claim leaves for the coverage computation, but resolve
  // them here so drift in either list fails loudly at module load.
  coreSelectors.forEach((selector) => resolveSelector(doc, selector));
  const index = Object.entries(capabilities)
    .map(([name, { blurb }]) => `${name} — ${blurb}`)
    .join('\n');
  return {
    capabilities,
    coreSelectors,
    index,
    fragments,
    core: buildCoreSchema(doc, capabilities),
    matchers,
  };
};

const compiledManifests = new Map<SupportedChartType, CompiledManifest>(
  Object.entries(chartTypeRegistry).flatMap(([chartType, { capabilities, coreSelectors }]) =>
    capabilities
      ? [
          [
            chartType as SupportedChartType,
            compileManifest(chartType as SupportedChartType, capabilities, coreSelectors ?? []),
          ] as const,
        ]
      : []
  )
);

/** One line per capability (`name — blurb`); undefined without a manifest. */
export const getCapabilityIndex = (chartType: SupportedChartType): string | undefined =>
  compiledManifests.get(chartType)?.index;

/**
 * Self-contained schema fragments for the named capabilities, in request
 * order. Unknown names are skipped; undefined without a manifest.
 */
export const getSchemaFragments = (
  chartType: SupportedChartType,
  names: string[]
): CapabilitySchemaFragment[] | undefined => {
  const compiled = compiledManifests.get(chartType);
  if (!compiled) return undefined;
  const seen = new Set<string>();
  const fragments: CapabilitySchemaFragment[] = [];
  for (const name of names) {
    const fragment = compiled.fragments[name];
    if (fragment !== undefined && !seen.has(name)) {
      seen.add(name);
      fragments.push(fragment);
    }
  }
  return fragments;
};

/** The converted schema minus capability-claimed subtrees; undefined without a manifest. */
export const getCoreSchema = (chartType: SupportedChartType): object | undefined =>
  compiledManifests.get(chartType)?.core;

/**
 * Maps a validation-error path (kbn-config-schema style, e.g.
 * `layers.0.y.1.color.type` or its segment array) to the capability owning the
 * deepest claimed subtree containing it (longest-prefix match). Returns
 * undefined for paths owned by the core schema or without a manifest.
 */
export const capabilityForErrorPath = (
  chartType: SupportedChartType,
  errorPath: string | Array<string | number>
): string | undefined => {
  const compiled = compiledManifests.get(chartType);
  if (!compiled) return undefined;
  const segments = (Array.isArray(errorPath) ? errorPath.map(String) : errorPath.split('.')).filter(
    (segment) => segment.length > 0
  );
  let best: { name: string; length: number } | undefined;
  for (const { name, selectors } of compiled.matchers) {
    for (const { instanceSegments } of selectors) {
      if (instanceSegments.length > segments.length) continue;
      if (best !== undefined && instanceSegments.length <= best.length) continue;
      const matches = instanceSegments.every((segment, i) =>
        segment === '*' ? /^\d+$/.test(segments[i]) : segment === segments[i]
      );
      if (matches) {
        best = { name, length: instanceSegments.length };
      }
    }
  }
  return best?.name;
};

const instanceHasValue = (
  value: unknown,
  segments: string[],
  index: number,
  branch?: { key: string; value: string }
): boolean => {
  if (index === segments.length) {
    if (value === undefined) return false;
    return branch ? isObject(value) && value[branch.key] === branch.value : true;
  }
  const segment = segments[index];
  if (segment === '*') {
    return (
      Array.isArray(value) &&
      value.some((item) => instanceHasValue(item, segments, index + 1, branch))
    );
  }
  return isObject(value) && instanceHasValue(value[segment], segments, index + 1, branch);
};

/**
 * True when the config carries a value at any path claimed by the named
 * capability. False for unknown capabilities or chart types without a manifest.
 */
export const configUsesCapability = (
  chartType: SupportedChartType,
  config: unknown,
  name: string
): boolean => {
  const matcher = compiledManifests.get(chartType)?.matchers.find((m) => m.name === name);
  if (!matcher) return false;
  return matcher.selectors.some(({ instanceSegments, branch }) =>
    instanceHasValue(config, instanceSegments, 0, branch)
  );
};

/**
 * Resolves a capability selector against a chart type's converted JSON schema,
 * returning the selected schema node. Throws when the selector does not
 * resolve or a branch discriminator is ambiguous. Exposed for the anti-drift
 * tests.
 */
export const resolveCapabilitySelector = (
  chartType: SupportedChartType,
  selector: CapabilitySelector
): object => {
  const doc = getSchemaForChartType(chartType) as JsonObject;
  return resolveSelector(doc, selector).node as object;
};

export interface CapabilityCoverage {
  /** Leaf schema paths not claimed by any capability or core selector. */
  unclaimed: string[];
  /** Leaf schema paths claimed by more than one owner. */
  conflicts: string[];
}

/** True when every union member is scalar (no properties/items/nested union). */
const isScalarUnion = (doc: JsonObject, variants: unknown[]): boolean =>
  variants.every((variant) => {
    const { node } = deref(doc, variant);
    if (!isObject(node)) return true;
    return (
      !isObject(node.properties) &&
      node.items === undefined &&
      node.anyOf === undefined &&
      node.oneOf === undefined
    );
  });

/**
 * Walks every leaf of the converted schema and reports which leaves are not
 * claimed by exactly one capability/core selector. This is the CI tripwire for
 * upstream schema growth: a new unclaimed field fails the coverage test until
 * it is assigned to a capability or to the core. Undefined without a manifest.
 */
export const computeCapabilityCoverage = (
  chartType: SupportedChartType
): CapabilityCoverage | undefined => {
  const compiled = compiledManifests.get(chartType);
  if (!compiled) return undefined;
  const doc = getSchemaForChartType(chartType) as JsonObject;

  const claims = new Map<string, Array<NormalizedSelector & { owner: string }>>();
  const addClaim = (owner: string, selector: CapabilitySelector) => {
    const normalized = normalizeSelector(selector);
    const list = claims.get(normalized.pointer) ?? [];
    list.push({ ...normalized, owner });
    claims.set(normalized.pointer, list);
  };
  for (const [name, capability] of Object.entries(compiled.capabilities)) {
    capability.select.forEach((selector) => addClaim(name, selector));
  }
  compiled.coreSelectors.forEach((selector) => addClaim('core', selector));

  const unclaimed: string[] = [];
  const conflicts: string[] = [];
  const onLeaf = (path: string, owners: string[]) => {
    const distinct = [...new Set(owners)];
    if (distinct.length === 0) unclaimed.push(path);
    if (distinct.length > 1) conflicts.push(`${path} ← ${distinct.join(', ')}`);
  };

  const walk = (
    node: unknown,
    pointer: string | null,
    display: string,
    owners: string[],
    refStack: string[]
  ): void => {
    let current = node;
    const localRefs: string[] = [];
    let name = refNameOf(current);
    while (name !== undefined) {
      if (refStack.includes(name) || localRefs.includes(name)) {
        onLeaf(`${display} (recursive $ref: ${name})`, owners);
        return;
      }
      localRefs.push(name);
      current = getDefs(doc)[name];
      name = refNameOf(current);
    }
    const nextStack = [...refStack, ...localRefs];
    let activeOwners = owners;
    const pointerClaims = pointer !== null ? claims.get(pointer) ?? [] : [];
    for (const claim of pointerClaims) {
      if (!claim.branch) activeOwners = [...activeOwners, claim.owner];
    }
    if (!isObject(current)) {
      onLeaf(display, activeOwners);
      return;
    }
    if (isObject(current.properties)) {
      const entries = Object.entries(current.properties);
      if (entries.length === 0) {
        onLeaf(display, activeOwners);
        return;
      }
      for (const [key, child] of entries) {
        walk(
          child,
          pointer !== null ? `${pointer}/properties/${key}` : null,
          `${display}/${key}`,
          activeOwners,
          nextStack
        );
      }
      return;
    }
    if (current.items !== undefined) {
      walk(
        current.items,
        pointer !== null ? `${pointer}/items` : null,
        `${display}/*`,
        activeOwners,
        nextStack
      );
      return;
    }
    const variants = asArray(current.anyOf) ?? asArray(current.oneOf);
    if (variants !== undefined) {
      if (isScalarUnion(doc, variants)) {
        onLeaf(display, activeOwners);
        return;
      }
      variants.forEach((variant, i) => {
        let branchOwners = activeOwners;
        for (const claim of pointerClaims) {
          if (claim.branch && branchAccepts(doc, variant, claim.branch)) {
            branchOwners = [...branchOwners, claim.owner];
          }
        }
        const label = refNameOf(variant) ?? `#${i}`;
        // Claims cannot target paths deeper than a union branch, so the
        // pointer stops here; ownership is inherited from the branch on down.
        walk(variant, null, `${display}(${label})`, branchOwners, nextStack);
      });
      return;
    }
    onLeaf(display, activeOwners);
  };

  walk(doc, '', '', [], []);
  return { unclaimed, conflicts };
};
