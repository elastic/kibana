/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// PROTOTYPE: generic model for the integration group onboarding wizard. Everything here is derived
// from each child integration's package info (policy templates, inputs, data streams, vars), so
// adding a group needs no Kibana change. The only Kibana-side copy is keyed by spec-level enums:
// data stream types (signals) and schema names.
//
// Wizard state is kept per schema (`SchemaState`): which streams are enabled and the var values
// the user edited, keyed by var path. `applySchemaState` writes it onto the stock package policy
// built by `useOnSubmit`; `carryOverSchemaState` moves it between schemas on a switch.

import { isEqual } from 'lodash';

import {
  DATASET_VAR_NAME,
  DATA_STREAM_TYPE_VAR_NAME,
  OTEL_TEMPLATE_SUFFIX,
} from '../../../../../../../../common/constants';
import {
  buildInputKey,
  dataStreamUsesOtelInput,
  doesPackageHaveIntegrations,
  getInputEffectiveName,
  getNormalizedInputs,
  getPolicyTemplateDataStreamPaths,
  getRegistryStreamWithDataStreamForInputType,
  isInputOnlyPolicyTemplate,
} from '../../../../../../../../common/services';
import type { PackagePolicyValidationResults } from '../../../../../../../../common/services';
import type {
  NewPackagePolicy,
  NewPackagePolicyInput,
  PackageInfo,
  PackagePolicyConfigRecord,
  RegistryVarGroup,
  RegistryVarsEntry,
} from '../../../../../../../types';

/* ---------- Model ---------- */

export const SCHEMA_STEP = 'schema';
export const SUMMARY_STEP = 'summary';
/** 'schema', one step per selected signal (data stream type, e.g. 'logs'), 'summary'. */
export type WizardStep = string;

export type VarScope = 'package' | 'input' | 'stream';

export interface WizardInput {
  /** `<policy template>-<input name or type>`, same as the stock inputs of a new package policy. */
  key: string;
  /** Key of this input in `validatePackagePolicy` results (no template prefix for 1-template packages). */
  validationKey: string;
  policyTemplate: string;
  type: string;
  name?: string;
  title: string;
  description?: string;
  vars: RegistryVarsEntry[];
  varGroups?: RegistryVarGroup[];
}

export interface WizardStream {
  /** `<input key>/<type>-<dataset>`, unique within one child package. */
  id: string;
  inputKey: string;
  /** Data stream type: logs, metrics, traces... */
  signal: string;
  /** Registry dataset, as stored in the package policy stream's `data_stream.dataset`. */
  dataset: string;
  title: string;
  description?: string;
  vars: RegistryVarsEntry[];
  varGroups?: RegistryVarGroup[];
  /** OTel collector input: documents land in `<type>-<dataset>.otel-<namespace>`. */
  isOtel: boolean;
  enabledByDefault: boolean;
  release?: string;
}

export interface SchemaModel {
  packageName: string;
  packageTitle: string;
  packageType: string;
  packageVars: RegistryVarsEntry[];
  packageVarGroups?: RegistryVarGroup[];
  inputs: WizardInput[];
  streams: WizardStream[];
  /** Signals with at least one stream, in display order. */
  signals: string[];
}

const SIGNAL_ORDER = ['logs', 'metrics', 'traces', 'synthetics', 'profiling'];

const sortSignals = (signals: string[]) =>
  [...new Set(signals)].sort((a, b) => {
    const ia = SIGNAL_ORDER.indexOf(a);
    const ib = SIGNAL_ORDER.indexOf(b);
    if (ia === -1 && ib === -1) return a.localeCompare(b);
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });

export const buildSchemaModel = (packageInfo: PackageInfo): SchemaModel => {
  const hasIntegrations = doesPackageHaveIntegrations(packageInfo);
  const inputs: WizardInput[] = [];
  const streams: WizardStream[] = [];

  (packageInfo.policy_templates ?? []).forEach((policyTemplate) => {
    const dataStreamPaths = getPolicyTemplateDataStreamPaths(packageInfo, policyTemplate);
    const inputOnly = isInputOnlyPolicyTemplate(policyTemplate);
    getNormalizedInputs(policyTemplate).forEach((input) => {
      if (input.deprecated) return;
      const effectiveName = getInputEffectiveName(input);
      const key = `${policyTemplate.name}-${effectiveName}`;
      inputs.push({
        key,
        validationKey: buildInputKey(effectiveName, policyTemplate.name, hasIntegrations),
        policyTemplate: policyTemplate.name,
        type: input.type,
        name: input.name,
        title: input.title,
        description: input.description,
        // Input-only packages: template vars end up on the (single) stream, see getNormalizedDataStreams.
        vars: inputOnly ? [] : input.vars ?? [],
        varGroups: inputOnly ? undefined : input.var_groups,
      });
      getRegistryStreamWithDataStreamForInputType(
        effectiveName,
        packageInfo,
        dataStreamPaths
      ).forEach((stream) => {
        if (stream.deprecated) return;
        const { type = 'logs', dataset } = stream.data_stream;
        const title = stream.title || stream.data_stream.title || dataset;
        // Input packages: the normalized stream repeats the template title as its description.
        const description = inputOnly ? policyTemplate.description : stream.description;
        streams.push({
          id: `${key}/${type}-${dataset}`,
          inputKey: key,
          signal: type,
          dataset,
          title,
          description: description !== title ? description : undefined,
          vars: stream.vars ?? [],
          varGroups: stream.var_groups,
          isOtel: dataStreamUsesOtelInput(packageInfo, stream.data_stream),
          enabledByDefault: stream.enabled !== false,
          release: stream.data_stream.release,
        });
      });
    });
  });

  return {
    packageName: packageInfo.name,
    packageTitle: packageInfo.title,
    packageType: packageInfo.type ?? 'integration',
    packageVars: packageInfo.vars ?? [],
    packageVarGroups: packageInfo.var_groups,
    inputs: inputs.filter((input) => streams.some((s) => s.inputKey === input.key)),
    streams,
    signals: sortSignals(streams.map((s) => s.signal)),
  };
};

/* ---------- Var paths ---------- */

// PROTOTYPE: var paths are opaque keys for the overrides map, never parsed.
export const packageVarPath = (name: string) => `package/${name}`;
export const inputVarPath = (inputKey: string, name: string) => `input/${inputKey}/${name}`;
export const streamVarPath = (streamId: string, name: string) => `stream/${streamId}/${name}`;

export interface WizardVar {
  path: string;
  scope: VarScope;
  def: RegistryVarsEntry;
  inputKey?: string;
  streamId?: string;
}

export const toPackageVar = (def: RegistryVarsEntry): WizardVar => ({
  path: packageVarPath(def.name),
  scope: 'package',
  def,
});

export const toInputVar = (input: WizardInput, def: RegistryVarsEntry): WizardVar => ({
  path: inputVarPath(input.key, def.name),
  scope: 'input',
  def,
  inputKey: input.key,
});

export const toStreamVar = (stream: WizardStream, def: RegistryVarsEntry): WizardVar => ({
  path: streamVarPath(stream.id, def.name),
  scope: 'stream',
  def,
  inputKey: stream.inputKey,
  streamId: stream.id,
});

export const getAllVars = (model: SchemaModel): WizardVar[] => [
  ...model.packageVars.map(toPackageVar),
  ...model.inputs.flatMap((input) => input.vars.map((def) => toInputVar(input, def))),
  ...model.streams.flatMap((stream) => stream.vars.map((def) => toStreamVar(stream, def))),
];

/* ---------- Per-schema state ---------- */

export interface SchemaState {
  /** Stream id -> enabled. Missing = stream default. */
  enabled: Record<string, boolean>;
  /** Var path -> value. Only vars the user edited; anything else keeps the package default. */
  values: Record<string, unknown>;
  /** `package` or a stream id -> var group name -> selected option. Missing = first option. */
  varGroupSelections: Record<string, Record<string, string>>;
}

export const emptySchemaState = (): SchemaState => ({
  enabled: {},
  values: {},
  varGroupSelections: {},
});

export const isStreamEnabled = (stream: WizardStream, state: SchemaState) =>
  state.enabled[stream.id] ?? stream.enabledByDefault;

export const getEnabledStreams = (model: SchemaModel, state: SchemaState) =>
  model.streams.filter((s) => isStreamEnabled(s, state));

export const getEnabledSignals = (model: SchemaModel, state: SchemaState) =>
  sortSignals(getEnabledStreams(model, state).map((s) => s.signal));

export const getSteps = (model: SchemaModel | undefined, state: SchemaState): WizardStep[] => [
  SCHEMA_STEP,
  ...(model ? getEnabledSignals(model, state) : []),
  SUMMARY_STEP,
];

/** Var group selections with defaults filled in: first option of each group, like the stock form. */
export const getVarGroupSelections = (
  varGroups: RegistryVarGroup[] | undefined,
  saved: Record<string, string> | undefined
): Record<string, string> =>
  Object.fromEntries(
    (varGroups ?? []).flatMap((group) => {
      const selected = saved?.[group.name] ?? group.options[0]?.name;
      return selected ? [[group.name, selected]] : [];
    })
  );

/* ---------- Apply state to the stock package policy ---------- */

export interface PolicyOverrides {
  name?: string;
  description?: string;
  namespace?: string;
}

const setVarValues = (
  vars: PackagePolicyConfigRecord | undefined,
  values: Record<string, unknown>,
  pathFor: (name: string) => string
): PackagePolicyConfigRecord | undefined => {
  if (!vars) return vars;
  let next = vars;
  Object.keys(vars).forEach((name) => {
    const path = pathFor(name);
    if (path in values && !isEqual(vars[name]?.value, values[path])) {
      next = { ...next, [name]: { ...vars[name], value: values[path] } };
    }
  });
  return next;
};

const policyInputKey = (input: Pick<NewPackagePolicyInput, 'policy_template' | 'type' | 'name'>) =>
  `${input.policy_template}-${getInputEffectiveName(input)}`;

/**
 * Writes wizard state onto the package policy built by the stock form hook. Returns only the
 * changed fields, or undefined when the policy already matches (so effects don't loop).
 */
export const applySchemaState = (
  packagePolicy: NewPackagePolicy,
  model: SchemaModel,
  state: SchemaState,
  policyOverrides: PolicyOverrides = {}
): Partial<NewPackagePolicy> | undefined => {
  const update: Partial<NewPackagePolicy> = {};

  (['name', 'description', 'namespace'] as const).forEach((field) => {
    const value = policyOverrides[field];
    if (value !== undefined && packagePolicy[field] !== value) update[field] = value;
  });

  const vars = setVarValues(packagePolicy.vars, state.values, packageVarPath);
  if (vars !== packagePolicy.vars) update.vars = vars;

  if (model.packageVarGroups?.length) {
    const selections = getVarGroupSelections(
      model.packageVarGroups,
      state.varGroupSelections.package
    );
    if (!isEqual(selections, packagePolicy.var_group_selections ?? {})) {
      update.var_group_selections = selections;
    }
  }

  const inputs = packagePolicy.inputs.map((input): NewPackagePolicyInput => {
    const key = policyInputKey(input);
    if (!model.inputs.some((i) => i.key === key)) return input;
    const streams = input.streams.map((stream) => {
      const wizardStream = model.streams.find(
        (s) =>
          s.inputKey === key &&
          s.dataset === stream.data_stream.dataset &&
          s.signal === (stream.data_stream.type ?? s.signal)
      );
      if (!wizardStream) return stream;
      const enabled = isStreamEnabled(wizardStream, state);
      const streamVars = setVarValues(stream.vars, state.values, (name) =>
        streamVarPath(wizardStream.id, name)
      );
      const selections = wizardStream.varGroups?.length
        ? getVarGroupSelections(wizardStream.varGroups, state.varGroupSelections[wizardStream.id])
        : undefined;
      if (
        enabled === stream.enabled &&
        streamVars === stream.vars &&
        (!selections || isEqual(selections, stream.var_group_selections ?? {}))
      ) {
        return stream;
      }
      return {
        ...stream,
        enabled,
        vars: streamVars,
        ...(selections ? { var_group_selections: selections } : {}),
      };
    });
    const inputVars = setVarValues(input.vars, state.values, (name) => inputVarPath(key, name));
    const enabled = streams.length ? streams.some((s) => s.enabled) : input.enabled;
    if (
      enabled === input.enabled &&
      inputVars === input.vars &&
      streams.every((s, i) => s === input.streams[i])
    ) {
      return input;
    }
    return { ...input, enabled, streams, vars: inputVars };
  });
  if (inputs.some((input, i) => input !== packagePolicy.inputs[i])) update.inputs = inputs;

  return Object.keys(update).length ? update : undefined;
};

/** Current value of a wizard var in the package policy (falls back to the registry default). */
export const getVarValue = (
  packagePolicy: NewPackagePolicy,
  model: SchemaModel,
  wizardVar: WizardVar
): unknown => {
  const fallback = !wizardVar.def.default && wizardVar.def.multi ? [] : wizardVar.def.default;
  const { name } = wizardVar.def;
  if (wizardVar.scope === 'package') return packagePolicy.vars?.[name]?.value ?? fallback;
  const input = packagePolicy.inputs.find((i) => policyInputKey(i) === wizardVar.inputKey);
  if (wizardVar.scope === 'input') return input?.vars?.[name]?.value ?? fallback;
  const stream = model.streams.find((s) => s.id === wizardVar.streamId);
  const policyStream = input?.streams.find((s) => s.data_stream.dataset === stream?.dataset);
  return policyStream?.vars?.[name]?.value ?? fallback;
};

/** Stock validation errors (`validatePackagePolicy`) for a wizard var. */
export const getVarErrors = (
  validationResults: PackagePolicyValidationResults | undefined,
  model: SchemaModel,
  wizardVar: WizardVar
): string[] | null => {
  if (!validationResults) return null;
  const { name } = wizardVar.def;
  if (wizardVar.scope === 'package') return validationResults.vars?.[name] ?? null;
  const input = model.inputs.find((i) => i.key === wizardVar.inputKey);
  const inputResults = input ? validationResults.inputs?.[input.validationKey] : undefined;
  if (wizardVar.scope === 'input') return inputResults?.vars?.[name] ?? null;
  const stream = model.streams.find((s) => s.id === wizardVar.streamId);
  return (stream && inputResults?.streams?.[stream.dataset]?.vars?.[name]) ?? null;
};

/* ---------- Target data streams (summary polls these) ---------- */

/**
 * Dataset the documents land in. Input packages let the user pick the dataset
 * (`data_stream.dataset` var); OTel collector inputs write to `<dataset>.otel`.
 */
export const getTargetDataset = (stream: WizardStream, datasetVarValue?: unknown): string => {
  const override =
    typeof datasetVarValue === 'string'
      ? datasetVarValue
      : (datasetVarValue as { dataset?: string } | undefined)?.dataset;
  const dataset = override || stream.dataset;
  return stream.isOtel && !dataset.endsWith(`.${OTEL_TEMPLATE_SUFFIX}`)
    ? `${dataset}.${OTEL_TEMPLATE_SUFFIX}`
    : dataset;
};

export const getTargetDataStreamPattern = (stream: WizardStream, datasetVarValue?: unknown) =>
  `${stream.signal}-${getTargetDataset(stream, datasetVarValue)}-*`;

/** Value of the stream's `data_stream.dataset` var, if it has one (input packages). */
export const getDatasetVarValue = (
  packagePolicy: NewPackagePolicy,
  model: SchemaModel,
  stream: WizardStream
) => {
  const def = stream.vars.find((v) => v.name === DATASET_VAR_NAME);
  return def ? getVarValue(packagePolicy, model, toStreamVar(stream, def)) : undefined;
};

/* ---------- Schema switch carry-over ---------- */

// PROTOTYPE: rules (written up in the workbench background/generic-forms-findings.md):
// - Streams pair by signal + dataset. A signal with exactly one unpaired stream on each side
//   pairs those two (Nginx ECS nginx.stubstatus <-> OTel nginxreceiver).
// - Enabled: a paired stream copies the source state. An unpaired stream follows its signal
//   (on if any source stream of that signal is on). Signals the source lacks keep the target's
//   own state or defaults.
// - Values: only vars the user edited. A var carries over when a var with the same name and a
//   compatible type exists in the paired stream, then that stream's input, then package level.
//   Everything else is dropped and reported.
// - Var group selections carry over for paired streams when the group name and option exist.
// - Policy name, description, namespace and agent policy live above the schema state, so they
//   always carry over.

export interface CarryOverReport {
  kept: Array<{ from: string; to: string; title: string }>;
  dropped: Array<{ from: string; title: string }>;
  /** Signals selected in the source schema that the target schema doesn't collect. */
  lostSignals: string[];
}

// Input package routing vars hold package-specific values (`{ dataset, package }`); never carried.
const NEVER_CARRIED = new Set([DATASET_VAR_NAME, DATA_STREAM_TYPE_VAR_NAME]);

const STRING_TYPES = new Set(['text', 'duration', 'url', 'textarea']);
const isCompatibleVar = (a: RegistryVarsEntry, b: RegistryVarsEntry) =>
  !!a.multi === !!b.multi &&
  (a.type === b.type || (STRING_TYPES.has(a.type) && STRING_TYPES.has(b.type)));

/** Source stream id -> paired target stream ids. */
export const pairStreams = (from: SchemaModel, to: SchemaModel): Map<string, string[]> => {
  const pairs = new Map<string, string[]>();
  const pairedTo = new Set<string>();
  from.streams.forEach((s) => {
    const matches = to.streams.filter((t) => t.signal === s.signal && t.dataset === s.dataset);
    if (matches.length) {
      pairs.set(
        s.id,
        matches.map((t) => t.id)
      );
      matches.forEach((t) => pairedTo.add(t.id));
    }
  });
  from.signals.forEach((signal) => {
    const fromLeft = from.streams.filter((s) => s.signal === signal && !pairs.has(s.id));
    const toLeft = to.streams.filter((t) => t.signal === signal && !pairedTo.has(t.id));
    if (fromLeft.length === 1 && toLeft.length === 1) {
      pairs.set(fromLeft[0].id, [toLeft[0].id]);
      pairedTo.add(toLeft[0].id);
    }
  });
  return pairs;
};

export const carryOverSchemaState = (
  from: { model: SchemaModel; state: SchemaState },
  to: { model: SchemaModel; state?: SchemaState }
): { state: SchemaState; report: CarryOverReport } => {
  const prev = to.state ?? emptySchemaState();
  const next: SchemaState = {
    enabled: { ...prev.enabled },
    values: { ...prev.values },
    varGroupSelections: { ...prev.varGroupSelections },
  };
  const report: CarryOverReport = {
    kept: [],
    dropped: [],
    lostSignals: getEnabledSignals(from.model, from.state).filter(
      (signal) => !to.model.signals.includes(signal)
    ),
  };
  const pairs = pairStreams(from.model, to.model);
  const fromIdsByTarget = new Map<string, string[]>();
  pairs.forEach((toIds, fromId) =>
    toIds.forEach((toId) =>
      fromIdsByTarget.set(toId, [...(fromIdsByTarget.get(toId) ?? []), fromId])
    )
  );
  const fromStreamEnabled = (id: string) => {
    const s = from.model.streams.find((x) => x.id === id);
    return !!s && isStreamEnabled(s, from.state);
  };

  // Enabled streams
  to.model.streams.forEach((t) => {
    const fromIds = fromIdsByTarget.get(t.id);
    if (fromIds?.length) {
      next.enabled[t.id] = fromIds.some(fromStreamEnabled);
    } else if (from.model.signals.includes(t.signal)) {
      next.enabled[t.id] = from.model.streams
        .filter((s) => s.signal === t.signal)
        .some((s) => isStreamEnabled(s, from.state));
    }
  });

  // Var values
  const fromVars = getAllVars(from.model);
  const toVars = getAllVars(to.model);
  const findTarget = (source: WizardVar): WizardVar | undefined => {
    const match = (candidates: WizardVar[]) =>
      candidates.find((c) => c.def.name === source.def.name && isCompatibleVar(source.def, c.def));
    const fromStreamIds =
      source.scope === 'stream'
        ? [source.streamId!]
        : source.scope === 'input'
        ? from.model.streams.filter((s) => s.inputKey === source.inputKey).map((s) => s.id)
        : [];
    const toStreamIds = fromStreamIds.flatMap((id) => pairs.get(id) ?? []);
    const toInputKeys = to.model.streams
      .filter((t) => toStreamIds.includes(t.id))
      .map((t) => t.inputKey);
    return (
      match(toVars.filter((v) => v.scope === 'stream' && toStreamIds.includes(v.streamId!))) ??
      match(toVars.filter((v) => v.scope === 'input' && toInputKeys.includes(v.inputKey!))) ??
      match(toVars.filter((v) => v.scope === 'package'))
    );
  };
  Object.entries(from.state.values).forEach(([path, value]) => {
    const source = fromVars.find((v) => v.path === path);
    if (!source || NEVER_CARRIED.has(source.def.name)) return;
    const title = source.def.title ?? source.def.name;
    const target = findTarget(source);
    if (target) {
      // PROTOTYPE: an input/package var could map to several paired streams; first match wins.
      next.values[target.path] = value;
      report.kept.push({ from: path, to: target.path, title });
    } else {
      report.dropped.push({ from: path, title });
    }
  });

  // Var group selections (package level + paired streams)
  const carryGroups = (
    fromKey: string,
    toKey: string,
    toGroups: RegistryVarGroup[] | undefined
  ) => {
    const saved = from.state.varGroupSelections[fromKey];
    if (!saved || !toGroups?.length) return;
    const carried = Object.fromEntries(
      Object.entries(saved).filter(([group, option]) =>
        toGroups.some((g) => g.name === group && g.options.some((o) => o.name === option))
      )
    );
    if (Object.keys(carried).length) {
      next.varGroupSelections[toKey] = { ...next.varGroupSelections[toKey], ...carried };
    }
  };
  carryGroups('package', 'package', to.model.packageVarGroups);
  pairs.forEach((toIds, fromId) =>
    toIds.forEach((toId) =>
      carryGroups(fromId, toId, to.model.streams.find((t) => t.id === toId)?.varGroups)
    )
  );

  return { state: next, report };
};

/* ---------- Copy keyed by spec enums (not by integration) ---------- */

export const SIGNAL_INFO: Record<string, { title: string; description: string }> = {
  logs: {
    title: 'Logs',
    description:
      'Event records of what happened - errors, audits, and activity you can search and analyze.',
  },
  metrics: {
    title: 'Metrics',
    description: 'Numeric measurements over time - throughput, latency, and saturation.',
  },
  traces: {
    title: 'Traces',
    description: 'Requests followed across services, with timing for each step.',
  },
  synthetics: {
    title: 'Synthetics',
    description: 'Results of scripted checks run against your services.',
  },
  profiling: {
    title: 'Profiles',
    description: 'Where CPU time and memory go in running code.',
  },
};

export const getSignalInfo = (signal: string) =>
  SIGNAL_INFO[signal] ?? {
    title: signal.charAt(0).toUpperCase() + signal.slice(1),
    description: '',
  };

export const SCHEMA_INFO: Record<string, { title: string; description: string }> = {
  otel: { title: 'OpenTelemetry', description: 'OpenTelemetry semantic conventions.' },
  ecs: { title: 'ECS', description: 'Elastic Common Schema - best for compatibility.' },
};

export const getSchemaInfo = (schema: string) =>
  SCHEMA_INFO[schema] ?? { title: schema.toUpperCase(), description: '' };

export const getStepLabel = (step: WizardStep) =>
  step === SCHEMA_STEP
    ? 'Schema & signals'
    : step === SUMMARY_STEP
    ? 'Summary'
    : getSignalInfo(step).title;

/**
 * PROTOTYPE: short stream label for the signal checkboxes. Drops a leading technology name
 * ("Nginx access logs" -> "Access logs") using the group title's first word. Heuristic.
 */
export const getStreamShortTitle = (stream: WizardStream, groupTitle: string) => {
  const prefix = groupTitle.split(' ')[0];
  const title = stream.title;
  if (prefix && title.toLowerCase().startsWith(`${prefix.toLowerCase()} `)) {
    const rest = title.slice(prefix.length + 1);
    return rest.charAt(0).toUpperCase() + rest.slice(1);
  }
  return title;
};
