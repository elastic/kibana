/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';

import type { ServiceVars } from '../../services/aws_onboarding_catalog/types';

/** What the run asks for: one entry per selected service, derived from the package manifest. */
export const awsOnboardingSettingsRequirementSchema = lazySchema(() =>
  z.object({
    package_name: z.literal('aws'),
    package_version: z.string(),
    region: z.string(),
    services: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        policy_template: z.string(),
        /** README "Notes" block, verbatim. */
        readme_notes: z.string().optional(),
        data_streams: z.array(
          z.object({
            /** The agentless matrix's data stream id, the key `ServiceVars` uses. */
            id: z.string(),
            dataset: z.string(),
            type: z.enum(['logs', 'metrics']),
            title: z.string(),
            /** Logs pick exactly one input; metrics are an on/off toggle. */
            choice: z.enum(['one_of', 'toggle']),
            /** The only default-enabled input, when exactly one is. */
            default_input: z.string().optional(),
            /** Toggle streams only: whether the package enables the stream by default. */
            default_enabled: z.boolean().optional(),
            inputs: z.array(
              z.object({
                input: z.string(),
                ingestion_method: z.string(),
                title: z.string(),
                description: z.string(),
                fields: z.array(
                  z.object({
                    name: z.string(),
                    title: z.string(),
                    description: z.string().optional(),
                    type: z.string(),
                    required: z.boolean(),
                    default: z.unknown().optional(),
                    options: z.array(z.object({ value: z.string(), text: z.string() })).optional(),
                    multi: z.boolean().optional(),
                  })
                ),
                /** Manifest default option first. */
                var_groups: z.array(
                  z.object({
                    name: z.string(),
                    title: z.string(),
                    options: z.array(
                      z.object({ name: z.string(), title: z.string(), vars: z.array(z.string()) })
                    ),
                  })
                ),
              })
            ),
          })
        ),
      })
    ),
  })
);

/** What the user, the agent or the form card returns. A service absent here is deselected. */
export const awsOnboardingSettingsAnswerSchema = lazySchema(() =>
  z
    .object({
      services: z.record(
        z.string().max(256),
        z
          .object({
            data_streams: z.record(
              z.string().max(256),
              z
                .object({
                  /** Null turns a toggle stream off; a one_of stream always needs an input. */
                  input: z.string().max(256).nullable(),
                  vars: z
                    .record(
                      z.string().max(256),
                      z.union([z.string().max(4096), z.boolean(), z.array(z.string().max(4096))])
                    )
                    .optional(),
                  var_group_selections: z
                    .record(z.string().max(256), z.string().max(256))
                    .optional(),
                })
                .strict()
            ),
          })
          .strict()
      ),
    })
    .strict()
);

export type AwsOnboardingSettingsRequirement = z.infer<
  typeof awsOnboardingSettingsRequirementSchema
>;
export type AwsOnboardingSettingsAnswer = z.infer<typeof awsOnboardingSettingsAnswerSchema>;

export interface SettingsProblem {
  path: string;
  message: string;
}

type RequirementService = AwsOnboardingSettingsRequirement['services'][number];
type RequirementDataStream = RequirementService['data_streams'][number];
type RequirementInput = RequirementDataStream['inputs'][number];
type AnswerDataStream = AwsOnboardingSettingsAnswer['services'][string]['data_streams'][string];

/** The selected option per group: the answer's choice when it names a real option, else the first. */
const effectiveSelections = (
  input: RequirementInput,
  selections: Record<string, string> | undefined
): Record<string, string> =>
  input.var_groups.reduce<Record<string, string>>((acc, { name, options }) => {
    const chosen = selections?.[name];
    const selected = options.find((option) => option.name === chosen) ?? options[0];
    if (selected) acc[name] = selected.name;
    return acc;
  }, {});

const hasValue = (value: unknown): boolean =>
  value !== undefined &&
  value !== null &&
  value !== '' &&
  !(Array.isArray(value) && value.length === 0);

const validateStream = (
  prefix: string,
  stream: RequirementDataStream,
  answer: AnswerDataStream
): SettingsProblem[] => {
  const { input: chosen, vars, var_group_selections: selections } = answer;

  if (chosen === null) {
    return stream.choice === 'one_of'
      ? [{ path: `${prefix}.input`, message: `${stream.title}: choose a collection method.` }]
      : [];
  }

  const input = stream.inputs.find((candidate) => candidate.input === chosen);
  if (!input) {
    return [{ path: `${prefix}.input`, message: `Unknown collection method "${chosen}".` }];
  }

  const problems: SettingsProblem[] = [];
  const fieldNames = new Set(input.fields.map(({ name }) => name));
  Object.keys(vars ?? {}).forEach((name) => {
    if (!fieldNames.has(name)) {
      problems.push({
        path: `${prefix}.vars.${name}`,
        message: `"${name}" is not a setting of the ${input.title} method.`,
      });
    }
  });

  const selected = effectiveSelections(input, selections);
  const groupOf = (fieldName: string) =>
    input.var_groups
      .flatMap((group) => group.options.map((option) => ({ group: group.name, option })))
      .find(({ option }) => option.vars.includes(fieldName));

  input.fields.forEach((field) => {
    if (!field.required || field.default !== undefined) return;
    const membership = groupOf(field.name);
    if (membership && selected[membership.group] !== membership.option.name) return;
    if (!hasValue(vars?.[field.name])) {
      problems.push({
        path: `${prefix}.vars.${field.name}`,
        message: `${field.title} is required for ${input.title}.`,
      });
    }
  });

  return problems;
};

/** Checks an answer against the requirement the run produced; an empty list means it is valid. */
export const validateSettingsAnswer = (
  requirement: AwsOnboardingSettingsRequirement,
  answer: AwsOnboardingSettingsAnswer
): SettingsProblem[] => {
  const answered = Object.entries(answer.services);
  if (answered.length === 0) {
    return [{ path: 'services', message: 'Select at least one service.' }];
  }

  return answered.flatMap(([serviceId, serviceAnswer]) => {
    const service = requirement.services.find(({ id }) => id === serviceId);
    if (!service) return [{ path: serviceId, message: `Unknown service "${serviceId}".` }];

    const answeredStreams = serviceAnswer.data_streams;
    const unknownStreams = Object.keys(answeredStreams)
      .filter((dsId) => !service.data_streams.some(({ id }) => id === dsId))
      .map((dsId) => ({
        path: `${serviceId}.${dsId}`,
        message: `Unknown data stream "${dsId}" for ${service.name}.`,
      }));

    const streamProblems = service.data_streams.flatMap((stream) => {
      const prefix = `${serviceId}.${stream.id}`;
      const streamAnswer = answeredStreams[stream.id];
      if (streamAnswer) return validateStream(prefix, stream, streamAnswer);
      // An omitted toggle takes the package default; an omitted log stream is a missing choice.
      return stream.choice === 'one_of'
        ? [{ path: `${prefix}.input`, message: `${stream.title}: choose a collection method.` }]
        : [];
    });

    return [...unknownStreams, ...streamProblems];
  });
};

/**
 * Converts a validated answer into the catalog's `ServiceVars`, one entry per answered service.
 * Var values pass through as given, so a boolean stays a boolean even though `ServiceVars`
 * declares strings; the package-input builder serialises them.
 */
export const settingsAnswerToServiceVars = (
  requirement: AwsOnboardingSettingsRequirement,
  answer: AwsOnboardingSettingsAnswer
): Record<string, ServiceVars> => {
  const result: Record<string, ServiceVars> = {};

  Object.entries(answer.services).forEach(([serviceId, serviceAnswer]) => {
    const service = requirement.services.find(({ id }) => id === serviceId);
    if (!service) return;

    const enabledDataStreams: string[] = [];
    const varsByDataStream: Record<string, unknown> = {};

    service.data_streams.forEach((stream) => {
      const streamAnswer = serviceAnswer.data_streams[stream.id];
      if (!streamAnswer) {
        const defaultOn = stream.choice === 'toggle' ? stream.default_enabled === true : false;
        if (defaultOn) enabledDataStreams.push(stream.id);
        return;
      }

      const { input: chosen, vars, var_group_selections: selections } = streamAnswer;
      if (chosen === null) return;
      const input = stream.inputs.find((candidate) => candidate.input === chosen);
      if (!input) return;

      enabledDataStreams.push(stream.id);
      varsByDataStream[stream.id] = {
        enabledInputs: [chosen],
        varsByInput: { [chosen]: vars ?? {} },
        varGroupSelectionsByInput: { [chosen]: effectiveSelections(input, selections) },
      };
    });

    result[serviceId] = {
      enabledDataStreams,
      varsByDataStream: varsByDataStream as ServiceVars['varsByDataStream'],
    };
  });

  return result;
};
