/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Per-suite reference adapters for judge replay.
 *
 * Golden score documents carry an empty `example.output`, so the ground truth a
 * judge grades against lives only in the suite's dataset module. Every suite
 * expresses that truth differently, and a single "read `output.reference`"
 * rule silently yields nothing for most of them:
 *
 *   persona-matrix : `output.reference` is already a prose string.
 *   attack-discovery : truth is a `criteria[]` array plus expected discoveries,
 *                      and examples have NO id -- golden records them
 *                      positionally ('0', '1', ...), so the join is by index.
 *   automatic-migrations : truth is structured translation fields
 *                          (translation_result / esql_query / is_unsupported),
 *                          most of them nullable, joined by a real example id.
 *
 * An adapter turns whatever a suite stores into the single thing the judge
 * needs: a reference STRING keyed by the `example.id` golden actually recorded.
 * Rendering structured truth as text is deliberate -- the correctness judge
 * compares prose, so the adapter must state the expectation explicitly rather
 * than hand the judge a JSON blob it has to reverse-engineer.
 */

export interface DatasetExample {
  id?: string;
  input?: unknown;
  output?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  reference?: unknown;
}

export interface ReferenceAdapter {
  /** Adapter id, reported in logs so a replay names the contract it used. */
  name: string;
  /** Export names to look for in the dataset module, in priority order. */
  exportNames: string[];
  /** True when this adapter recognises the module's examples. */
  matches: (examples: DatasetExample[]) => boolean;
  /** exampleId -> reference string. */
  build: (examples: DatasetExample[]) => Map<string, string>;
}

const isNonEmptyString = (v: unknown): v is string => typeof v === 'string' && v.length > 0;

/**
 * persona-matrix: the reference is already prose.
 */
export const personaMatrixAdapter: ReferenceAdapter = {
  name: 'persona-matrix',
  exportNames: ['personaMatrixDataset', 'PERSONA_MATRIX_EXAMPLES', 'default', 'dataset'],
  matches: (examples) =>
    examples.some((e) => isNonEmptyString(e?.output?.reference ?? e?.reference)),
  build: (examples) => {
    const refs = new Map<string, string>();
    for (const example of examples) {
      const reference = example?.output?.reference ?? example?.reference;
      if (isNonEmptyString(example?.id) && isNonEmptyString(reference)) {
        refs.set(example.id, reference);
      }
    }
    return refs;
  },
};

/**
 * attack-discovery: criteria[] + expected discoveries, joined POSITIONALLY.
 *
 * The dataset carries no ids and golden stores `example.id` as the array index
 * ('0', '1', ...), so the index IS the join key. Keying by scenarioKey instead
 * would produce references no score document can ever match.
 */
export const attackDiscoveryAdapter: ReferenceAdapter = {
  name: 'attack-discovery',
  exportNames: [
    'cleanProfileProvidedAlertsExamples',
    'cleanProfileProvidedAlertsDataset',
    'default',
    'dataset',
  ],
  matches: (examples) => examples.some((e) => Array.isArray(e?.output?.criteria)),
  build: (examples) => {
    const refs = new Map<string, string>();
    examples.forEach((example, index) => {
      const output = example?.output ?? {};
      const criteria = (output.criteria as string[] | undefined) ?? [];
      const discoveries = (output.attackDiscoveries as Array<Record<string, unknown>>) ?? [];

      const parts: string[] = [];
      if (criteria.length > 0) {
        parts.push(
          `The attack discovery insights must satisfy all of the following:\n` +
            criteria.map((c) => `- ${c}`).join('\n')
        );
      }
      for (const discovery of discoveries) {
        const title = discovery.title;
        const summary = discovery.summaryMarkdown;
        const details = discovery.detailsMarkdown;
        const tactics = discovery.mitreAttackTactics;
        const lines: string[] = [];
        if (isNonEmptyString(title)) lines.push(`Expected discovery: ${title}`);
        if (isNonEmptyString(summary)) lines.push(`Summary: ${summary}`);
        if (isNonEmptyString(details)) lines.push(`Details: ${details}`);
        if (Array.isArray(tactics) && tactics.length > 0) {
          lines.push(`MITRE ATT&CK tactics: ${tactics.join(', ')}`);
        }
        if (lines.length > 0) parts.push(lines.join('\n'));
      }

      // An example with neither criteria nor discoveries has no ground truth;
      // emitting a placeholder would grade answers against nothing.
      if (parts.length === 0) return;
      refs.set(example.id ?? String(index), parts.join('\n\n'));
    });
    return refs;
  },
};

const TRANSLATION_LABELS: Record<string, string> = {
  full: 'fully translated',
  partial: 'partially translated',
  untranslatable: 'not translatable',
};

/**
 * automatic-migrations: structured translation expectations, joined by id.
 *
 * Fields are nullable by design (an untranslatable rule has no ESQL), so the
 * adapter states absence explicitly instead of dropping the field -- "no ESQL
 * query is expected" and "the ESQL query was not checked" grade differently.
 */
export const automaticMigrationsAdapter: ReferenceAdapter = {
  name: 'automatic-migrations',
  exportNames: ['splunkRules', 'qradarRules', 'default', 'dataset'],
  matches: (examples) => examples.some((e) => e?.output && 'translation_result' in e.output),
  build: (examples) => {
    const refs = new Map<string, string>();
    for (const example of examples) {
      if (!isNonEmptyString(example?.id)) continue;
      const o = example.output ?? {};
      const lines: string[] = [];

      const result = o.translation_result;
      if (isNonEmptyString(result)) {
        lines.push(`Expected translation result: ${TRANSLATION_LABELS[result] ?? result}.`);
      }
      if (o.is_unsupported === true) {
        lines.push('The source rule uses an unsupported pattern and must be reported as such.');
      }
      if (isNonEmptyString(o.esql_query)) {
        lines.push(`Expected ES|QL query:\n${o.esql_query}`);
      } else if (o.esql_query === null) {
        lines.push('No ES|QL query is expected for this rule.');
      }
      if (isNonEmptyString(o.index_pattern)) {
        lines.push(`Expected index pattern: ${o.index_pattern}`);
      }
      if (isNonEmptyString(o.integration_id)) {
        lines.push(`Expected integration: ${o.integration_id}`);
      }
      if (isNonEmptyString(o.prebuilt_rule_id)) {
        lines.push(`Expected prebuilt rule match: ${o.prebuilt_rule_id}`);
      }
      if (o.has_lookup_join === true) {
        lines.push('The translation must preserve a LOOKUP JOIN.');
      }

      if (lines.length === 0) continue;
      refs.set(example.id, lines.join('\n'));
    }
    return refs;
  },
};

export const REFERENCE_ADAPTERS: ReferenceAdapter[] = [
  personaMatrixAdapter,
  attackDiscoveryAdapter,
  automaticMigrationsAdapter,
];

/**
 * Collect the example arrays a module exports, across every adapter's known
 * export names. Migrations splits its dataset over two exports
 * (splunkRules + qradarRules), so a single-export lookup would silently
 * replay half the suite.
 */
export function collectExamples(mod: Record<string, unknown>): DatasetExample[] {
  const seen = new Set<unknown>();
  const examples: DatasetExample[] = [];
  const names = [...new Set(REFERENCE_ADAPTERS.flatMap((a) => a.exportNames))];

  for (const name of names) {
    const value = mod[name];
    const arr = Array.isArray(value)
      ? value
      : Array.isArray((value as { examples?: unknown })?.examples)
      ? ((value as { examples: DatasetExample[] }).examples as DatasetExample[])
      : undefined;
    if (!arr || seen.has(arr)) continue;
    seen.add(arr);
    examples.push(...(arr as DatasetExample[]));
  }
  return examples;
}

/** Pick the adapter whose contract the examples actually satisfy. */
export function selectAdapter(examples: DatasetExample[]): ReferenceAdapter | undefined {
  return REFERENCE_ADAPTERS.find((adapter) => adapter.matches(examples));
}
