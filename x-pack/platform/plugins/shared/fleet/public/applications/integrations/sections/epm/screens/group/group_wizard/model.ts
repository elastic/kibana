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
import {
  isAgentlessIntegration,
  isOnlyAgentlessIntegration,
} from '../../../../../../../../common/services/agentless_policy_helper';
import { SetupTechnology } from '../../../../../../../../common/types';
import { getInputUnitsByPackage } from '../../../../../../fleet/sections/agents/agent_details_page/components/agent_details/input_status_utils';
import type {
  Agent,
  DataStream,
  NewPackagePolicy,
  NewPackagePolicyInput,
  PackageInfo,
  PackagePolicy,
  PackagePolicyConfigRecord,
  RegistryVarGroup,
  RegistryVarsEntry,
} from '../../../../../../../types';

/* ---------- Model ---------- */

// Install order from the design direction (hub, 3.4): what to collect -> how (deployment, hidden
// with a single method) -> settings per signal -> review -> detect -> exit.
export const COLLECT_STEP = 'collect';
export const HOW_STEP = 'how';
export const REVIEW_STEP = 'review';
export const DETECT_STEP = 'detect';
/** PROTOTYPE: provisional, design hasn't settled "Review and install" vs "Detect and review". */
export const DETECT_STEP_LABEL = 'Detect and review';
/** collect, how?, one step per selected signal (data stream type, e.g. 'logs'), review, detect. */
export type WizardStep = string;
const FIXED_STEPS = [COLLECT_STEP, HOW_STEP, REVIEW_STEP, DETECT_STEP];
export const isSignalStep = (step: WizardStep) => !FIXED_STEPS.includes(step);

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
  packageVersion: string;
  packageType: string;
  /** Deployment methods the child declares (agentless needs the deployment to support it too). */
  supportsAgentless: boolean;
  agentlessOnly: boolean;
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
    packageVersion: packageInfo.version,
    packageType: packageInfo.type ?? 'integration',
    supportsAgentless: isAgentlessIntegration(packageInfo),
    agentlessOnly: isOnlyAgentlessIntegration(packageInfo),
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
  /** PROTOTYPE: push source id -> enabled. Missing = enabled. */
  push?: Record<string, boolean>;
}

export const emptySchemaState = (): SchemaState => ({
  enabled: {},
  values: {},
  varGroupSelections: {},
});

export const isStreamEnabled = (stream: WizardStream, state: SchemaState) =>
  state.enabled[stream.id] ?? stream.enabledByDefault;

/** Enabled streams, grouped by signal in display order. */
export const getEnabledStreams = (model: SchemaModel, state: SchemaState) => {
  const enabled = model.streams.filter((s) => isStreamEnabled(s, state));
  return sortSignals(enabled.map((s) => s.signal)).flatMap((signal) =>
    enabled.filter((s) => s.signal === signal)
  );
};

/**
 * PROTOTYPE: one choice per data stream (signal + dataset). A data stream several inputs can
 * collect (CrowdStrike FDR: aws-s3 or logfile) is one checkbox; turning it on enables its
 * default-enabled streams (else the first), turning it off disables them all.
 */
export interface DataStreamChoice {
  key: string;
  title: string;
  streams: WizardStream[];
}

export const getDataStreamChoices = (model: SchemaModel, signal: string): DataStreamChoice[] => {
  const choices: DataStreamChoice[] = [];
  model.streams
    .filter((s) => s.signal === signal)
    .forEach((stream) => {
      const key = `${stream.signal}-${stream.dataset}`;
      const existing = choices.find((c) => c.key === key);
      if (existing) existing.streams.push(stream);
      else choices.push({ key, title: stream.title, streams: [stream] });
    });
  return choices;
};

export const isDataStreamChoiceEnabled = (choice: DataStreamChoice, state: SchemaState) =>
  choice.streams.some((s) => isStreamEnabled(s, state));

export const toggleDataStreamChoice = (
  choice: DataStreamChoice,
  on: boolean
): Record<string, boolean> => {
  if (!on) return Object.fromEntries(choice.streams.map((s) => [s.id, false]));
  const defaults = choice.streams.filter((s) => s.enabledByDefault);
  const enable = new Set(
    (defaults.length ? defaults : choice.streams.slice(0, 1)).map((s) => s.id)
  );
  return Object.fromEntries(choice.streams.map((s) => [s.id, enable.has(s.id)]));
};

export const getEnabledSignals = (model: SchemaModel, state: SchemaState) =>
  sortSignals(getEnabledStreams(model, state).map((s) => s.signal));

export const getDeploymentMethods = (
  model: SchemaModel | undefined,
  isAgentlessAvailable: boolean
): SetupTechnology[] => {
  if (!model) return [SetupTechnology.AGENT_BASED];
  return [
    ...(isAgentlessAvailable && model.supportsAgentless ? [SetupTechnology.AGENTLESS] : []),
    ...(!model.agentlessOnly || !isAgentlessAvailable ? [SetupTechnology.AGENT_BASED] : []),
  ];
};

/**
 * Zero selected signals is allowed (Nima's spec): the settings steps drop out and review offers
 * an "install assets only" path. The "how" step only shows when there's a real choice.
 */
export const getSteps = (
  model: SchemaModel | undefined,
  state: SchemaState,
  { showHow = false }: { showHow?: boolean } = {}
): WizardStep[] => getGroupSteps([{ model, state }], { showHow });

/**
 * PROTOTYPE: steps for one or more selected packages of a schema (pick-any members, e.g.
 * crowdstrike + ti_crowdstrike): one settings step per signal any of them collects.
 */
export const getGroupSteps = (
  units: Array<{ model?: SchemaModel; state: SchemaState }>,
  { showHow = false }: { showHow?: boolean } = {}
): WizardStep[] => [
  COLLECT_STEP,
  ...(showHow ? [HOW_STEP] : []),
  ...sortSignals(
    units.flatMap(({ model, state }) =>
      model
        ? [
            ...getEnabledSignals(model, state),
            ...getEnabledPushSources(model, state).map((p) => p.signal),
          ]
        : []
    )
  ),
  REVIEW_STEP,
  DETECT_STEP,
];

/* ---------- Push sources (prototype special case) ---------- */

/**
 * PROTOTYPE: a signal the technology pushes to an Elastic managed endpoint, set up on the
 * technology's side (no package policy, nothing to install). Hardcoded until packages can declare
 * it. Supabase: logs come from a Supabase Log Drain into Managed Inputs, metrics from the
 * `supabase` package (scrape).
 */
export interface PushSource {
  id: string;
  packageName: string;
  signal: string;
  title: string;
  description: string;
  /** Managed Inputs path the source sends to. */
  endpointPath: string;
  setupSteps: string[];
}

export const PUSH_SOURCES: PushSource[] = [
  {
    id: 'supabase-log-drain',
    packageName: 'supabase',
    signal: 'logs',
    title: 'Supabase Log Drain',
    description:
      'Supabase pushes project logs to an Elastic managed endpoint. Set up in Supabase, nothing to install.',
    endpointPath: '/inputs/supabase/_default_/v1/logs',
    setupSteps: [
      'In the Supabase dashboard, open Project Settings > Log Drains and add a destination.',
      'Use the endpoint below and add the Authorization header with an Elastic API key.',
      'Save. Logs from Postgres, Auth, Storage, Realtime, Edge Functions and the API gateway start flowing within a minute.',
    ],
  },
];

/** Placeholder until the deployment's Managed Inputs URL is known to Kibana. */
export const MANAGED_INPUTS_BASE_URL = 'https://<deployment>.ingest.<region>.elastic.cloud';

export const getPushSources = (model?: SchemaModel): PushSource[] =>
  model ? PUSH_SOURCES.filter((p) => p.packageName === model.packageName) : [];

export const isPushSourceEnabled = (source: PushSource, state: SchemaState) =>
  state.push?.[source.id] ?? true;

export const getEnabledPushSources = (model: SchemaModel | undefined, state: SchemaState) =>
  getPushSources(model).filter((p) => isPushSourceEnabled(p, state));

/* ---------- Review: what gets installed ---------- */

export interface InstallSummary {
  packageTitle: string;
  packageVersion: string;
  dashboards: number;
  otherKibanaAssets: number;
  elasticsearchAssets: number;
  /** Content packages installed alongside (`requires.content`), e.g. nginx_otel. */
  contentPackages: Array<{ package: string; version: string }>;
}

export const getInstallSummary = (packageInfo: PackageInfo): InstallSummary => {
  const kibana = Object.entries(packageInfo.assets?.kibana ?? {});
  const es = Object.values(packageInfo.assets?.elasticsearch ?? {});
  const count = (parts: unknown) => (Array.isArray(parts) ? parts.length : 0);
  return {
    packageTitle: packageInfo.title,
    packageVersion: packageInfo.version,
    dashboards: count(packageInfo.assets?.kibana?.dashboard),
    otherKibanaAssets: kibana
      .filter(([type]) => type !== 'dashboard')
      .reduce((n, [, parts]) => n + count(parts), 0),
    elasticsearchAssets: es.reduce((n, parts) => n + count(parts), 0),
    contentPackages: packageInfo.requires?.content ?? [],
  };
};

/**
 * PROTOTYPE: "Install content" review text. Content = the package's Kibana assets (everything
 * under `kibana/`), all or nothing. Elasticsearch assets always install.
 */
export const getContentInstallText = (
  summary: InstallSummary,
  installContent: boolean
): { hasContent: boolean; installed: string; skipped?: string } => {
  const contentCount = summary.dashboards + summary.otherKibanaAssets;
  const pkg = `${summary.packageTitle} ${summary.packageVersion}`;
  // No count: package-level asset lists don't include the per data stream templates and pipelines.
  const esText = 'Elasticsearch assets (index templates, ingest pipelines)';
  if (contentCount === 0) {
    // Composable packages (pre package-structure design) pull content from a content package.
    const deps = summary.contentPackages.map((c) => `${c.package} ${c.version}`).join(', ');
    return {
      hasContent: false,
      installed: deps
        ? `${pkg}: ${esText}, plus content from ${deps}.`
        : `${pkg}: ${esText}. No content in this package.`,
    };
  }
  const parts = [
    summary.dashboards > 0 ? plural(summary.dashboards, 'dashboard') : undefined,
    summary.otherKibanaAssets > 0
      ? plural(summary.otherKibanaAssets, 'other Kibana asset') +
        ' (alert and SLO templates, ML jobs, saved searches)'
      : undefined,
  ].filter(Boolean);
  const content = parts.join(' and ');
  return installContent
    ? { hasContent: true, installed: `${pkg}: ${esText}, plus content: ${content}.` }
    : {
        hasContent: true,
        installed: `${pkg}: ${esText} only.`,
        skipped: `Not installed: ${content}. Reinstall ${summary.packageTitle} with content to add them later.`,
      };
};

const plural = (n: number, noun: string) => `${n} ${noun}${n === 1 ? '' : 's'}`;

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
  prometheus: {
    title: 'Prometheus',
    description: 'Native Prometheus metric names and labels, stored as scraped.',
  },
  ocsf: { title: 'OCSF', description: 'Open Cybersecurity Schema Framework.' },
};

/** Schema copy. A group's `schema_labels` rename the title (Prometheus: ecs -> "Legacy"). */
export const getSchemaInfo = (schema: string, schemaLabels?: Record<string, string>) => {
  const info = SCHEMA_INFO[schema] ?? { title: schema.toUpperCase(), description: '' };
  const label = schemaLabels?.[schema];
  return label ? { ...info, title: label } : info;
};

const STEP_LABELS: Record<string, string> = {
  [COLLECT_STEP]: 'What to collect',
  [HOW_STEP]: 'Deployment',
  [REVIEW_STEP]: 'Review',
  [DETECT_STEP]: DETECT_STEP_LABEL,
};

export const getStepLabel = (step: WizardStep) => STEP_LABELS[step] ?? getSignalInfo(step).title;

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

/* ---------- Detect and review ---------- */

export const RECENT_DATA_MS = 10 * 60 * 1000;

export interface DetectAgents {
  total: number;
  online: number;
  /** Wizard input key -> first unhealthy unit message for that input, across agents. */
  inputErrors: Record<string, string>;
}

export type DetectStatus =
  | { kind: 'receiving'; count?: number; lastSeenMs: number }
  | { kind: 'error'; message: string }
  | {
      kind: 'waiting';
      reason: 'checking' | 'no_agents' | 'agents_offline' | 'no_data_yet' | 'agentless';
    };

/** Unhealthy input units of the saved package policy, keyed like wizard inputs. */
export const getAgentInputErrors = (
  agents: Array<Pick<Agent, 'id' | 'components' | 'local_metadata'>>,
  packagePolicy: Pick<PackagePolicy, 'id' | 'inputs'>
): Record<string, string> => {
  const errors: Record<string, string> = {};
  agents.forEach((agent) => {
    packagePolicy.inputs
      .filter((input) => input.enabled)
      .forEach((input) => {
        const key = policyInputKey(input);
        if (errors[key]) return;
        // Same matching as the agent details page (input id, else package policy id, + input type).
        const unit = getInputUnitsByPackage(agent.components ?? [], input.id ?? packagePolicy.id)
          .filter((u) => u.id.includes(input.type))
          .find((u) => u.status === 'FAILED' || u.status === 'DEGRADED');
        if (unit) {
          const host = agent.local_metadata?.host?.hostname ?? agent.id;
          errors[key] = `${host}: ${unit.message || unit.status.toLowerCase()}`;
        }
      });
  });
  return errors;
};

/** Per data stream status: never blocks, errors show on the row. */
export const getDetectStatus = ({
  stream,
  dataset,
  dataStreams,
  counts,
  agents,
  isAgentless = false,
  now = Date.now(),
}: {
  stream: WizardStream;
  dataset: string;
  dataStreams: Array<Pick<DataStream, 'dataset' | 'type' | 'last_activity_ms'>>;
  counts?: Record<string, number>;
  agents?: DetectAgents;
  isAgentless?: boolean;
  now?: number;
}): DetectStatus => {
  const error = agents?.inputErrors[stream.inputKey];
  if (error) return { kind: 'error', message: error };
  const match = dataStreams
    .filter((ds) => ds.dataset === dataset && ds.type === stream.signal)
    .sort((a, b) => b.last_activity_ms - a.last_activity_ms)[0];
  if (match && now - match.last_activity_ms < RECENT_DATA_MS) {
    return { kind: 'receiving', count: counts?.[dataset], lastSeenMs: match.last_activity_ms };
  }
  if (isAgentless) return { kind: 'waiting', reason: 'agentless' };
  if (!agents) return { kind: 'waiting', reason: 'checking' };
  if (agents.total === 0) return { kind: 'waiting', reason: 'no_agents' };
  if (agents.online === 0) return { kind: 'waiting', reason: 'agents_offline' };
  return { kind: 'waiting', reason: 'no_data_yet' };
};
