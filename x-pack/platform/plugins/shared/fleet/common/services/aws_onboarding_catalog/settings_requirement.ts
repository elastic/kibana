/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import type { PackageInfo, RegistryVarsEntry } from '../../types';
import type { AwsOnboardingSettingsRequirement } from '../../workflows/steps/settings';

import type { AwsServiceMatrixEntry, DataStreamInfo } from './aws_service_matrix';
import {
  REGION_FIELD_NAMES,
  SOURCE_VAR_GROUPS,
  SOURCE_VAR_REGION_FIELDS,
  getStreamVarGroups,
  isAdvancedVar,
} from './field_config';
import type { CredentialVarName } from './types';

/** The name of the source group synthesised for an input whose manifest declares no var_groups. */
const SOURCE_GROUP_NAME = 'source';

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
/** A "Note"/"Notes" heading, or a line that is only "Note:" with optional emphasis markers. */
const NOTE_ANCHOR =
  /^\s*(?:#{1,6}\s+[*_]*notes?[*_]*\s*:?|[*_]{0,3}notes?[*_]{0,3}\s*:?[*_]{0,3})\s*$/i;
/** How far below the anchor the list may start, counting the anchor's next line as 1. */
const MAX_LINES_TO_LIST = 2;

/**
 * The bullet list directly under a "Note"/"Notes" heading or "Note:" line, as the original lines.
 * The list must start within two lines of the anchor; otherwise returns undefined.
 */
export const extractReadmeNotes = (markdown: string): string | undefined => {
  // Blockquote markers ("> **Note**:") are layout, not content.
  const lines = markdown.split(/\r?\n/).map((line) => line.replace(/^\s*>\s?/, ''));
  let start = -1;
  lines.some((line, anchor) => {
    if (!NOTE_ANCHOR.test(line)) return false;
    for (let offset = 1; offset <= MAX_LINES_TO_LIST; offset++) {
      const candidate = lines[anchor + offset] ?? '';
      if (BULLET.test(candidate)) {
        start = anchor + offset;
        return true;
      }
      if (candidate.trim() !== '') return false;
    }
    return false;
  });
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

  // Drop the list's own indentation (the real README indents bullets by one space).
  const indent = Math.min(...bullets.map((line) => line.length - line.trimStart().length));
  const notes = bullets
    .map((line) => line.slice(indent).trimEnd())
    .join('\n')
    .slice(0, README_NOTES_MAX_LENGTH)
    .trim();
  return notes === '' ? undefined : notes;
};

/** The policy template's README path relative to the package, ready for the registry file API. */
export const getPolicyTemplateReadmePath = (
  packageInfo: PackageInfo,
  policyTemplate: string
): string | undefined => {
  const template = packageInfo.policy_templates?.find(({ name }) => name === policyTemplate);
  // The template type is a union and only some members declare a readme.
  const readme = template && 'readme' in template ? template.readme : undefined;
  if (typeof readme !== 'string' || readme === '') return undefined;
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
      // Secrets stay out because the agent would read them back in the chat. Everything else is
      // carried so the agent can name and set optional values.
      return def.secret !== true && def.type !== 'password';
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
        // The explicit null counts as no default here too, so a required var stays in the main form.
        advanced:
          isAdvancedVar({ ...def, default: rawDefault ?? undefined }) && !groupVars.has(name),
        // The manifest sometimes carries an explicit null: that is no default.
        ...(rawDefault !== undefined && rawDefault !== null ? { default: rawDefault } : {}),
        ...(options ? { options } : {}),
        ...(multi !== undefined ? { multi } : {}),
      };
    });

interface SourceGroup {
  name: string;
  title: string;
  required?: boolean;
  options: Array<{ name: string; title: string; vars: string[] }>;
}

/**
 * A required one-of group over the input's source vars, for an input whose manifest declares no
 * var_groups but which cannot collect without one source. One option per source var; an option
 * that names a resource without its region also carries the region var, so the answer converter
 * fills it from the run's region.
 */
const buildSourceGroup = (
  input: string,
  varDefs: Record<string, RegistryVarsEntry> | undefined
): SourceGroup[] => {
  const sourceVars = (SOURCE_VAR_GROUPS[input] ?? []).filter((name) => varDefs?.[name]);
  if (sourceVars.length < 2) return [];
  return [
    {
      name: SOURCE_GROUP_NAME,
      title: i18n.translate('xpack.fleet.awsOnboardingSettings.sourceGroupTitle', {
        defaultMessage: 'Source',
      }),
      required: true,
      options: sourceVars.map((name) => {
        const regionVar = SOURCE_VAR_REGION_FIELDS[name];
        return {
          name,
          title: varDefs?.[name]?.title ?? name,
          vars: regionVar && varDefs?.[regionVar] ? [name, regionVar] : [name],
        };
      }),
    },
  ];
};

const buildInput = (
  service: AwsServiceMatrixEntry,
  dsInfo: DataStreamInfo,
  input: string,
  packageInfo: PackageInfo
): RequirementInput => {
  const stream = packageInfo.data_streams
    ?.find(({ dataset }) => dataset === dsInfo.dataset)
    ?.streams?.find((candidate) => candidate.input === input);

  const varDefs = dsInfo.varDefsByInput[input];
  const manifestGroups = getStreamVarGroups(service, input);
  const groups: SourceGroup[] =
    manifestGroups.length > 0 ? manifestGroups : buildSourceGroup(input, varDefs);
  const groupVars = new Set(groups.flatMap(({ options }) => options.flatMap((o) => o.vars)));
  const requiredGroupVars = new Set(
    groups
      .filter(({ required }) => required === true)
      .flatMap(({ options }) => options.flatMap((o) => o.vars))
  );

  return {
    input,
    ingestion_method: stream?.ingestion_method ?? input,
    title: stream?.title ?? input,
    description: stream?.description ?? '',
    fields: buildFields(varDefs, groupVars, requiredGroupVars),
    // Manifest order is kept: the first option is the default.
    var_groups: groups.map(({ name, title, options }) => ({
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
