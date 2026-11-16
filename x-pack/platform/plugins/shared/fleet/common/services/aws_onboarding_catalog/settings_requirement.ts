/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PackageInfo, RegistryVarsEntry } from '../../types';
import type { AwsOnboardingSettingsRequirement } from '../../workflows/steps/settings';

import type { AwsServiceMatrixEntry, DataStreamInfo } from './aws_service_matrix';
import { REGION_FIELD_NAMES, getStreamVarGroups } from './field_config';
import type { CredentialVarName } from './types';

type RequirementService = AwsOnboardingSettingsRequirement['services'][number];
type RequirementDataStream = RequirementService['data_streams'][number];
type RequirementInput = RequirementDataStream['inputs'][number];
type RequirementField = RequirementInput['fields'][number];

const README_NOTES_MAX_LENGTH = 1500;

/** Vars `buildStreamVars` backfills from the credentials step, so the user is never asked. */
const CREDENTIAL_VAR_NAMES = new Set<CredentialVarName>([
  'access_key_id',
  'secret_access_key',
  'session_token',
]);

const BULLET = /^\s*[-*+]\s+\S/;
const NOTE_WORD = /\bnotes?\b/i;

/**
 * The first markdown bullet list that follows a heading or paragraph containing "Note", as the
 * original lines. Tolerant: returns undefined when there is no such list.
 */
export const extractReadmeNotes = (markdown: string): string | undefined => {
  const lines = markdown.split(/\r?\n/);
  const noteLine = lines.findIndex((line) => NOTE_WORD.test(line) && !BULLET.test(line));
  if (noteLine === -1) return undefined;

  const start = lines.findIndex((line, index) => index > noteLine && BULLET.test(line));
  if (start === -1) return undefined;

  const bullets: string[] = [];
  for (let index = start; index < lines.length; index++) {
    const line = lines[index];
    if (line.trim() === '') {
      // A blank line ends the list unless another bullet follows directly.
      if (!BULLET.test(lines[index + 1] ?? '')) break;
      continue;
    }
    const isContinuation = /^\s{2,}\S/.test(line);
    if (!BULLET.test(line) && !isContinuation) break;
    bullets.push(line);
  }

  const notes = bullets.join('\n').trim().slice(0, README_NOTES_MAX_LENGTH).trim();
  return notes === '' ? undefined : notes;
};

/** The policy template's README path relative to the package, ready for the registry file API. */
export const getPolicyTemplateReadmePath = (
  packageInfo: PackageInfo,
  policyTemplate: string
): string | undefined => {
  const readme = packageInfo.policy_templates?.find(({ name }) => name === policyTemplate)?.readme;
  if (!readme) return undefined;
  const prefix = `/package/${packageInfo.name}/${packageInfo.version}/`;
  return readme.startsWith(prefix) ? readme.slice(prefix.length) : readme.replace(/^\/+/, '');
};

const buildFields = (
  varDefs: Record<string, RegistryVarsEntry> | undefined,
  groupVars: Set<string>,
  requiredGroupVars: Set<string>
): RequirementField[] =>
  Object.entries(varDefs ?? {})
    .filter(([name, def]) => {
      if (REGION_FIELD_NAMES.has(name) || CREDENTIAL_VAR_NAMES.has(name as CredentialVarName)) {
        return false;
      }
      return def.required === true || def.show_user === true || groupVars.has(name);
    })
    .map(([name, def]) => {
      const { default: rawDefault, options, multi, description } = def;
      return {
        name,
        title: def.title ?? name,
        ...(description ? { description } : {}),
        type: def.type,
        // A required var_group makes every var of its options required once selected.
        required: def.required === true || requiredGroupVars.has(name),
        // The manifest sometimes carries an explicit null: that is no default.
        ...(rawDefault !== undefined && rawDefault !== null ? { default: rawDefault } : {}),
        ...(options ? { options } : {}),
        ...(multi !== undefined ? { multi } : {}),
      };
    });

const buildInput = (
  service: AwsServiceMatrixEntry,
  dsInfo: DataStreamInfo,
  input: string,
  packageInfo: PackageInfo
): RequirementInput => {
  const stream = packageInfo.data_streams
    ?.find(({ dataset }) => dataset === dsInfo.dataset)
    ?.streams?.find((candidate) => candidate.input === input);

  const registryGroups = getStreamVarGroups(service, input);
  const groupVars = new Set(
    registryGroups.flatMap(({ options }) => options.flatMap((o) => o.vars))
  );
  const requiredGroupVars = new Set(
    registryGroups
      .filter(({ required }) => required === true)
      .flatMap(({ options }) => options.flatMap((o) => o.vars))
  );

  return {
    input,
    ingestion_method: stream?.ingestion_method ?? input,
    title: stream?.title ?? input,
    description: stream?.description ?? '',
    fields: buildFields(dsInfo.varDefsByInput[input], groupVars, requiredGroupVars),
    // Manifest order is kept: the first option is the default.
    var_groups: registryGroups.map(({ name, title, options }) => ({
      name,
      title,
      options: options.map((option) => ({
        name: option.name,
        title: option.title,
        vars: option.vars,
      })),
    })),
  };
};

const buildDataStream = (
  service: AwsServiceMatrixEntry,
  id: string,
  dsInfo: DataStreamInfo,
  packageInfo: PackageInfo
): RequirementDataStream => {
  const type = dsInfo.type === 'metrics' ? 'metrics' : 'logs';
  const dataset = dsInfo.dataset ?? id;
  return {
    id,
    dataset,
    type,
    title: dsInfo.title ?? dataset,
    choice: type === 'metrics' ? 'toggle' : 'one_of',
    ...(dsInfo.defaultEnabledInputs.length === 1
      ? { default_input: dsInfo.defaultEnabledInputs[0] }
      : {}),
    ...(type === 'metrics' ? { default_enabled: dsInfo.defaultEnabledInputs.length > 0 } : {}),
    inputs: dsInfo.inputs.map((input) => buildInput(service, dsInfo, input, packageInfo)),
  };
};

/** What the run asks the user for, derived from the agentless matrix and the package manifest. */
export const buildSettingsRequirement = ({
  services,
  packageInfo,
  region,
  readmeNotesByService,
}: {
  services: AwsServiceMatrixEntry[];
  packageInfo: PackageInfo;
  region: string;
  readmeNotesByService?: Record<string, string>;
}): AwsOnboardingSettingsRequirement => ({
  package_name: 'aws',
  package_version: packageInfo.version,
  region,
  services: services.map((service) => {
    const notes = readmeNotesByService?.[service.id];
    return {
      id: service.id,
      name: service.name,
      policy_template: service.policyTemplate ?? service.id,
      ...(notes ? { readme_notes: notes } : {}),
      data_streams: service.dataStreams.flatMap((id) => {
        const dsInfo = service.varDefsByDataStream?.[id];
        return dsInfo ? [buildDataStream(service, id, dsInfo, packageInfo)] : [];
      }),
    };
  }),
});
