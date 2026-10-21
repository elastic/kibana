/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* RESEARCH ONLY (Track 7.P-3). Boot-set policy for the alerting island.
 * Admission is exact id equality. A prefix or suffix of a real id is not admitted.
 * The execution class is `.es-query` plus `.index` (the index connector and the
 * index-threshold rule). stackConnectors is the optional producer: baseline boots
 * the whole plugin; class registers only the `.index` connector. */

export const BOOT_ARMS = ['baseline', 'class'] as const;
export type BootArm = (typeof BOOT_ARMS)[number];

/** Plugins the alerting runner calls setup and start on, apart from the optional connector plugin. */
export const REQUIRED_PLUGINS = ['eventLog', 'actions', 'alerting', 'stackAlerts'] as const;

/** Optional producer. It registers every stack connector, including ones this class never runs. */
export const OPTIONAL_PRODUCER_IDS = ['stackConnectors'] as const;

/**
 * Declared execution class. The boot list is this array, not the optional-producer catalogue.
 * `.index-threshold` is the rule id behind task type `alerting:.es-query`'s sibling `.index` action.
 */
export const ALERTING_ES_QUERY_INDEX_CLASS = {
  id: 'alerting',
  taskTypes: ['alerting:.es-query', 'actions:.index'],
  ruleTypes: ['.es-query', '.index-threshold'],
  actionTypes: ['.index'],
  plugins: REQUIRED_PLUGINS,
} as const;

const REQUIRED = new Set<string>(REQUIRED_PLUGINS);
const OPTIONAL = new Set<string>(OPTIONAL_PRODUCER_IDS);

export type OptionalDecision = 'boot' | 'skip';

/** Unknown values stay baseline so a typo cannot drop the index connector. */
export const readBootArm = (raw: string | undefined): BootArm =>
  (BOOT_ARMS as readonly string[]).includes(raw ?? '') ? (raw as BootArm) : 'baseline';

/** Exact required-plugin admission. `eventLog2` and `eventLogger` are rejected. */
export const admitRequired = (id: string): boolean => REQUIRED.has(id);

/** Exact optional-producer admission. `stackConnector` is rejected. */
export const admitOptional = (id: string): boolean => OPTIONAL.has(id);

/**
 * Whether this optional id is set up during boot.
 * Class skips it. Baseline boots it. Required ids are not optional and are skipped here.
 */
export const decideOptional = (arm: BootArm, id: string): OptionalDecision => {
  if (!OPTIONAL.has(id)) return 'skip';
  return arm === 'baseline' ? 'boot' : 'skip';
};

/** Plugins actually started. Encrypted saved objects join only when the island owns local SO. */
export const pluginsFor = (arm: BootArm, localSo: boolean): string[] => {
  const producers = OPTIONAL_PRODUCER_IDS.filter((id) => decideOptional(arm, id) === 'boot');
  const ids = [...REQUIRED_PLUGINS, ...producers];
  return localSo ? ['encryptedSavedObjects', ...ids] : ids;
};

/** Class action allowlist. Anything else, including `.index2`, is outside the class. */
export const admitsClassAction = (id: string): boolean =>
  (ALERTING_ES_QUERY_INDEX_CLASS.actionTypes as readonly string[]).includes(id);

interface IndexConnectorModule {
  getConnectorType: () => { id: string };
}

/** Loads only the index connector module. Does not load the stack-connectors barrel. */
export const loadClassIndexConnector = async (): Promise<{ id: string }> => {
  const specifier: string = '@kbn/stack-connectors-plugin/server/connector_types/es_index';
  const loaded = (await import(specifier)) as IndexConnectorModule & {
    default?: IndexConnectorModule;
  };
  const factory = loaded.getConnectorType ?? loaded.default?.getConnectorType;
  if (!factory) throw new Error('t7a class connector module has no getConnectorType');
  const type = factory();
  if (!admitsClassAction(type.id)) {
    throw new Error(`t7a class connector ${type.id} is outside the execution class`);
  }
  return type;
};
