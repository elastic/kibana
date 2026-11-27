/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Document, isMap, isPair, isScalar, isSeq, parseDocument, YAMLMap, YAMLSeq } from 'yaml';
import type { Node, Pair } from 'yaml';
import type { BranchSlot } from '@kbn/workflows';
import { STEP_CHILD_CONTAINER_KEYS } from '@kbn/workflows';
import { detectIndent } from '@kbn/workflows-yaml';

/**
 * Canvas edit-mode mutations. Every function takes the full workflow YAML,
 * applies one structural change through the `yaml` Document AST (so comments,
 * quoting and unknown keys survive), and returns the new YAML string. The
 * Document is the only model: callers dispatch the result straight back into
 * the editor's `yamlString`.
 */

/**
 * Why a mutation could not be applied. Carries a machine-readable `code` plus the data a UI needs
 * to build a translated message; `detail` is the YAML library's own (untranslated) parse message.
 */
export type MutationError =
  | { readonly code: 'yaml-parse-error'; readonly detail: string }
  | { readonly code: 'yaml-root-not-mapping' }
  | { readonly code: 'fragment-parse-error'; readonly detail: string }
  | { readonly code: 'fragment-not-mapping' }
  | { readonly code: 'step-not-found'; readonly stepName: string }
  | { readonly code: 'trigger-not-found'; readonly triggerIndex: number }
  | { readonly code: 'branch-not-found'; readonly index: number }
  | { readonly code: 'branch-not-map'; readonly index: number }
  | { readonly code: 'cases-missing' }
  | { readonly code: 'case-not-found'; readonly index: number };

export type MutationResult =
  | { readonly success: true; readonly yaml: string }
  | { readonly success: false; readonly yaml: string; readonly error: MutationError };

const fail = (yaml: string, error: MutationError): MutationResult => ({
  success: false,
  yaml,
  error,
});

/**
 * Forces block style on a step/trigger sequence. A fresh workflow starts with
 * `triggers: []` / `steps: []` (or a branch starts as `else: []`) — the `yaml`
 * library remembers that empty collection was written as flow style, and
 * keeps rendering it on one line even after items are spliced in. Step and
 * trigger lists are never meant to be single-line; call this on every
 * sequence a mutation is about to read from or write into so the editor
 * output stays readable regardless of how the array started out.
 */
const asBlockSeq = (seq: YAMLSeq): YAMLSeq => {
  seq.flow = false;
  return seq;
};

const serialize = (doc: Document, indent: number): string => doc.toString({ indent, lineWidth: 0 });

type ParsedDocument =
  | { readonly success: true; readonly doc: Document }
  | { readonly success: false; readonly error: MutationError };

const parse = (yaml: string): ParsedDocument => {
  const doc = parseDocument(yaml);
  if (doc.errors.length > 0) {
    return { success: false, error: { code: 'yaml-parse-error', detail: doc.errors[0].message } };
  }
  if (doc.contents !== null && !isMap(doc.contents)) {
    return { success: false, error: { code: 'yaml-root-not-mapping' } };
  }
  return { success: true, doc };
};

type ParsedFragment =
  | { readonly success: true; readonly node: YAMLMap }
  | { readonly success: false; readonly error: MutationError };

/** Parses a single step fragment (`name: …\ntype: …`) into a map node. */
const parseStepFragment = (fragment: string): ParsedFragment => {
  const doc = parseDocument(fragment);
  if (doc.errors.length > 0) {
    return {
      success: false,
      error: { code: 'fragment-parse-error', detail: doc.errors[0].message },
    };
  }
  if (!isMap(doc.contents)) {
    return { success: false, error: { code: 'fragment-not-mapping' } };
  }
  return { success: true, node: doc.contents };
};

/** The key of a map entry when it is a plain string scalar (numeric/boolean keys are not). */
const stringKeyOf = (pair: Pair): string | undefined => {
  if (!isScalar(pair.key)) return undefined;
  const { value } = pair.key;
  return typeof value === 'string' ? value : undefined;
};

const STEP_CHILD_CONTAINER_KEY_SET: ReadonlySet<string> = new Set(STEP_CHILD_CONTAINER_KEYS);

/**
 * The step sequences held under a child-container key. `cases` / `branches`
 * hold wrapper maps (`{ match, steps }` / `{ name, steps }`), so only each
 * wrapper's `steps` list is returned and a wrapper's own `name` is never read
 * as a step name. Every other container key is itself a step sequence.
 */
const stepListsUnder = (key: string, value: unknown): unknown[] => {
  if (key !== 'cases' && key !== 'branches') return [value];
  if (!isSeq(value)) return [];
  return value.items.filter(isMap).map((wrapper) => wrapper.get('steps'));
};

interface StepLocation {
  readonly seq: YAMLSeq;
  readonly index: number;
  readonly node: YAMLMap;
  /** The `fallback` owner (`on-failure` map) when the step is an error-route step. */
  readonly onFailureOwner?: YAMLMap;
}

/** Read-only: never normalises the nodes it walks (see `locateStepForWrite`). */
const findStepInNode = (
  node: unknown,
  stepName: string,
  onFailureOwner?: YAMLMap
): StepLocation | null => {
  if (isSeq(node)) {
    for (let index = 0; index < node.items.length; index++) {
      const item = node.items[index];
      if (isMap(item) && item.get('name') === stepName) {
        return { seq: node, index, node: item, onFailureOwner };
      }
      const found = findStepInNode(item, stepName, onFailureOwner);
      if (found) return found;
    }
    return null;
  }
  if (isMap(node)) {
    for (const pair of node.items) {
      const key = stringKeyOf(pair);
      if (key !== undefined && STEP_CHILD_CONTAINER_KEY_SET.has(key)) {
        const isFailureBlock = key === 'on-failure' || key === 'iteration-on-failure';
        const owner = isFailureBlock && isMap(pair.value) ? pair.value : undefined;
        const lists = isFailureBlock ? [owner?.get('fallback')] : stepListsUnder(key, pair.value);
        const fallbackOwner = isFailureBlock ? owner : key === 'fallback' ? node : undefined;
        for (const list of lists) {
          const found = findStepInNode(list, stepName, fallbackOwner);
          if (found) return found;
        }
      }
    }
  }
  return null;
};

const locateStep = (doc: Document, stepName: string): StepLocation | null => {
  if (!isMap(doc.contents)) return null;
  return findStepInNode(doc.contents.get('steps'), stepName);
};

/**
 * `locateStep` for write paths: forces block style on the sequence that holds the step (see
 * `asBlockSeq`) so the splice/replace that follows renders readably. Read paths use `locateStep`.
 */
const locateStepForWrite = (doc: Document, stepName: string): StepLocation | null => {
  const location = locateStep(doc, stepName);
  if (location) asBlockSeq(location.seq);
  return location;
};

/**
 * Collects the trimmed, non-empty name of every step in the document (any nesting), for
 * unique-name generation. Trims like `collect_step_names.ts` so both agree on a collision.
 */
export const collectStepNamesFromYaml = (yaml: string): ReadonlySet<string> => {
  const names = new Set<string>();
  const doc = parseDocument(yaml);
  const walk = (node: unknown) => {
    if (isSeq(node)) {
      node.items.forEach(walk);
      return;
    }
    if (!isMap(node)) return;
    const name = node.get('name');
    if (typeof name === 'string' && name.trim()) names.add(name.trim());
    for (const pair of node.items) {
      const key = stringKeyOf(pair);
      if (key !== undefined && STEP_CHILD_CONTAINER_KEY_SET.has(key))
        stepListsUnder(key, pair.value).forEach(walk);
    }
  };
  if (isMap(doc.contents)) walk(doc.contents.get('steps'));
  return names;
};

/** Returns `base`, or `base_2`, `base_3`, … until it doesn't collide. */
export const uniqueStepName = (base: string, taken: ReadonlySet<string>): string => {
  if (!taken.has(base)) return base;
  for (let n = 2; ; n++) {
    const candidate = `${base}_${n}`;
    if (!taken.has(candidate)) return candidate;
  }
};

const ensureTopLevelSeq = (doc: Document, key: 'steps' | 'triggers'): YAMLSeq => {
  const root = isMap(doc.contents) ? doc.contents : new YAMLMap();
  doc.contents = root;
  const existing = root.get(key);
  if (isSeq(existing)) return asBlockSeq(existing);
  const seq = new YAMLSeq();
  root.set(key, seq);
  return seq;
};

/**
 * Prepends a step (YAML fragment) to the top-level `steps` array.
 * Used when inserting the first step (clicking the flow port on a trigger — `mode: 'prepend-step'`).
 */
export const prependStep = (yaml: string, stepFragment: string): MutationResult => {
  const parsed = parse(yaml);
  if (!parsed.success) return fail(yaml, parsed.error);
  const fragment = parseStepFragment(stepFragment);
  if (!fragment.success) return fail(yaml, fragment.error);
  const seq = ensureTopLevelSeq(parsed.doc, 'steps');
  seq.items.unshift(fragment.node);
  return { success: true, yaml: serialize(parsed.doc, detectIndent(yaml)) };
};

/**
 * Splices a step immediately after the step named `anchorStepName` in its
 * containing sequence. Handles any nesting that `locateStep` can find
 * (top-level, `steps`, `else`, `on-failure.fallback`).
 */
export const insertStepAfterName = (
  yaml: string,
  stepFragment: string,
  anchorStepName: string
): MutationResult => {
  const parsed = parse(yaml);
  if (!parsed.success) return fail(yaml, parsed.error);
  const fragment = parseStepFragment(stepFragment);
  if (!fragment.success) return fail(yaml, fragment.error);
  const location = locateStepForWrite(parsed.doc, anchorStepName);
  if (!location) return fail(yaml, { code: 'step-not-found', stepName: anchorStepName });
  location.seq.items.splice(location.index + 1, 0, fragment.node);
  return { success: true, yaml: serialize(parsed.doc, detectIndent(yaml)) };
};

type ResolvedBranch =
  | { readonly success: true; readonly seq: YAMLSeq }
  | { readonly success: false; readonly error: MutationError };

/** Resolves the target YAMLSeq for a `BranchSlot` on the given step map. */
const resolveBranchSeq = (ownerNode: YAMLMap, slot: BranchSlot): ResolvedBranch => {
  const ensureSeqIn = (container: YAMLMap, key: string): ResolvedBranch => {
    const existing = container.get(key);
    if (isSeq(existing)) return { success: true, seq: asBlockSeq(existing) };
    const created = new YAMLSeq();
    container.set(key, created);
    return { success: true, seq: created };
  };

  switch (slot.kind) {
    case 'steps':
      return ensureSeqIn(ownerNode, 'steps');
    case 'else':
      return ensureSeqIn(ownerNode, 'else');
    case 'default':
      return ensureSeqIn(ownerNode, 'default');
    case 'branch': {
      const branches = ownerNode.get('branches');
      if (!isSeq(branches) || slot.index < 0 || slot.index >= branches.items.length) {
        return { success: false, error: { code: 'branch-not-found', index: slot.index } };
      }
      const branchWrapper = branches.items[slot.index];
      if (!isMap(branchWrapper)) {
        return { success: false, error: { code: 'branch-not-map', index: slot.index } };
      }
      return ensureSeqIn(branchWrapper, 'steps');
    }
    case 'case': {
      const cases = ownerNode.get('cases');
      if (!isSeq(cases)) return { success: false, error: { code: 'cases-missing' } };
      // Look up by index (robust against duplicate or empty match values).
      const caseItem = cases.items[slot.index];
      if (!isMap(caseItem)) {
        return { success: false, error: { code: 'case-not-found', index: slot.index } };
      }
      return ensureSeqIn(caseItem, 'steps');
    }
  }
};

/**
 * Inserts a step fragment into the branch sequence identified by `slot` on the
 * step named `ownerStepName`. Creates the branch sequence if absent.
 *
 * `position === 'start'` prepends the step (chip "+" inserts at the branch head).
 * `position === 'end'` (default) appends the step.
 */
export const insertStepIntoBranch = (
  yaml: string,
  stepFragment: string,
  ownerStepName: string,
  slot: BranchSlot,
  position: 'start' | 'end' = 'end'
): MutationResult => {
  const parsed = parse(yaml);
  if (!parsed.success) return fail(yaml, parsed.error);
  const fragment = parseStepFragment(stepFragment);
  if (!fragment.success) return fail(yaml, fragment.error);
  const location = locateStepForWrite(parsed.doc, ownerStepName);
  if (!location) return fail(yaml, { code: 'step-not-found', stepName: ownerStepName });
  const branch = resolveBranchSeq(location.node, slot);
  if (!branch.success) return fail(yaml, branch.error);
  if (position === 'start') {
    branch.seq.items.unshift(fragment.node);
  } else {
    branch.seq.items.push(fragment.node);
  }
  return { success: true, yaml: serialize(parsed.doc, detectIndent(yaml)) };
};

/** Appends a trigger (YAML fragment, `type: …`) to `triggers`. */
export const appendTrigger = (yaml: string, triggerFragment: string): MutationResult => {
  const parsed = parse(yaml);
  if (!parsed.success) return fail(yaml, parsed.error);
  const fragment = parseStepFragment(triggerFragment);
  if (!fragment.success) return fail(yaml, fragment.error);

  const triggers = ensureTopLevelSeq(parsed.doc, 'triggers');
  triggers.items.push(fragment.node);
  return { success: true, yaml: serialize(parsed.doc, detectIndent(yaml)) };
};

/** How many triggers the YAML declares. */
export const countTriggers = (yaml: string): number => {
  const doc = parseDocument(yaml);
  const triggers = isMap(doc.contents) ? doc.contents.get('triggers') : undefined;
  return isSeq(triggers) ? triggers.items.length : 0;
};

/** Removes the trigger at declaration index `triggerIndex`. */
export const deleteTrigger = (yaml: string, triggerIndex: number): MutationResult => {
  const parsed = parse(yaml);
  if (!parsed.success) return fail(yaml, parsed.error);
  const { doc } = parsed;
  const triggers = isMap(doc.contents) ? doc.contents.get('triggers') : undefined;
  if (!isSeq(triggers) || triggerIndex < 0 || triggerIndex >= triggers.items.length) {
    return fail(yaml, { code: 'trigger-not-found', triggerIndex });
  }
  triggers.items.splice(triggerIndex, 1);
  if (triggers.items.length === 0 && isMap(doc.contents)) {
    doc.contents.delete('triggers');
  }
  return { success: true, yaml: serialize(parsed.doc, detectIndent(yaml)) };
};

/** Extracts a trigger's YAML fragment (a mapping, comments included). */
export const getTriggerFragment = (yaml: string, triggerIndex: number): string | undefined => {
  const doc = parseDocument(yaml);
  const triggers = isMap(doc.contents) ? doc.contents.get('triggers') : undefined;
  if (!isSeq(triggers) || triggerIndex < 0 || triggerIndex >= triggers.items.length) {
    return undefined;
  }
  const item = triggers.items[triggerIndex];
  if (!isMap(item)) return undefined;
  const fragment = new Document();
  fragment.contents = item.clone() as Node;
  return fragment.toString({ indent: detectIndent(yaml), lineWidth: 0 });
};

/**
 * Replaces the trigger at `triggerIndex` with the parsed fragment. Comments and
 * unknown keys inside the fragment are carried over verbatim.
 */
export const replaceTriggerFragment = (
  yaml: string,
  triggerIndex: number,
  triggerFragment: string
): MutationResult => {
  const parsed = parse(yaml);
  if (!parsed.success) return fail(yaml, parsed.error);
  const { doc } = parsed;
  const triggers = isMap(doc.contents) ? doc.contents.get('triggers') : undefined;
  if (!isSeq(triggers) || triggerIndex < 0 || triggerIndex >= triggers.items.length) {
    return fail(yaml, { code: 'trigger-not-found', triggerIndex });
  }
  const fragment = parseStepFragment(triggerFragment);
  if (!fragment.success) return fail(yaml, fragment.error);

  triggers.items[triggerIndex] = fragment.node;
  return { success: true, yaml: serialize(parsed.doc, detectIndent(yaml)) };
};

/**
 * Sets `on-failure.fallback` on `stepName` to contain the given step, keeping
 * any sibling `on-failure` keys (retry / continue) intact.
 */
export const setStepFallback = (
  yaml: string,
  stepName: string,
  stepFragment: string
): MutationResult => {
  const parsed = parse(yaml);
  if (!parsed.success) return fail(yaml, parsed.error);
  const { doc } = parsed;
  const location = locateStepForWrite(doc, stepName);
  if (!location) return fail(yaml, { code: 'step-not-found', stepName });
  const fragment = parseStepFragment(stepFragment);
  if (!fragment.success) return fail(yaml, fragment.error);

  const existing = location.node.get('on-failure');
  const onFailure = isMap(existing) ? existing : new YAMLMap();
  onFailure.set('fallback', doc.createNode([fragment.node]));
  if (!isMap(existing)) location.node.set('on-failure', onFailure);
  return { success: true, yaml: serialize(parsed.doc, detectIndent(yaml)) };
};

/**
 * Deletes a step by name. A step's own `on-failure` branch goes with it. When
 * the step is a fallback step, its parent's error route is cleared instead.
 */
export const deleteStepByName = (yaml: string, stepName: string): MutationResult => {
  const parsed = parse(yaml);
  if (!parsed.success) return fail(yaml, parsed.error);
  const { doc } = parsed;
  const location = locateStepForWrite(doc, stepName);
  if (!location) return fail(yaml, { code: 'step-not-found', stepName });

  location.seq.items.splice(location.index, 1);

  const { onFailureOwner } = location;
  if (onFailureOwner && location.seq.items.length === 0) {
    onFailureOwner.delete('fallback');
    if (onFailureOwner.items.length === 0) {
      removeChildMap(doc, onFailureOwner);
    }
  }
  return { success: true, yaml: serialize(parsed.doc, detectIndent(yaml)) };
};

/** Removes the pair whose value is `target` from whichever map owns it. */
const removeChildMap = (doc: Document, target: YAMLMap): void => {
  const visit = (node: unknown): boolean => {
    if (isSeq(node)) return node.items.some(visit);
    if (!isMap(node)) return false;
    const idx = node.items.findIndex((p) => isPair(p) && p.value === target);
    if (idx >= 0) {
      node.items.splice(idx, 1);
      return true;
    }
    return node.items.some((p) => isPair(p) && visit(p.value));
  };
  visit(doc.contents);
};

/**
 * Source character range `[start, end)` of `stepName`'s mapping node in `yaml`
 * (end = just after its last value, including that line's trailing newline).
 * Used to splice a live-edited fragment back into its exact position for
 * full-document validation/autocomplete without re-serializing the document.
 */
export const getStepSourceRange = (
  yaml: string,
  stepName: string
): readonly [number, number] | undefined => {
  const doc = parseDocument(yaml);
  const location = locateStep(doc, stepName);
  if (!location || !location.node.range) return undefined;
  return [location.node.range[0], location.node.range[1]];
};

/** Extracts a step's YAML fragment (a mapping, comments included). */
export const getStepFragment = (yaml: string, stepName: string): string | undefined => {
  const doc = parseDocument(yaml);
  const location = locateStep(doc, stepName);
  if (!location) return undefined;
  const fragment = new Document();
  fragment.contents = location.node.clone() as Node;
  return fragment.toString({ indent: detectIndent(yaml), lineWidth: 0 });
};

/**
 * Replaces the step named `stepName` with the parsed fragment. Nested steps,
 * comments and unknown keys inside the fragment are carried over verbatim.
 */
export const replaceStepFragment = (
  yaml: string,
  stepName: string,
  stepFragment: string
): MutationResult => {
  const parsed = parse(yaml);
  if (!parsed.success) return fail(yaml, parsed.error);
  const location = locateStepForWrite(parsed.doc, stepName);
  if (!location) return fail(yaml, { code: 'step-not-found', stepName });
  const fragment = parseStepFragment(stepFragment);
  if (!fragment.success) return fail(yaml, fragment.error);

  location.seq.items[location.index] = fragment.node;
  return { success: true, yaml: serialize(parsed.doc, detectIndent(yaml)) };
};
