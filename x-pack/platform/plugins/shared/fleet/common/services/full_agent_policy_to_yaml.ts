/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FullAgentPolicy } from '../types';

import type { YamlModule } from './yaml_utils';
import { createYamlKeysSorter, toYaml } from './yaml_utils';

const POLICY_KEYS_ORDER = [
  'id',
  'name',
  'revision',
  'dataset',
  'type',
  'outputs',
  'fleet',
  'output_permissions',
  'agent',
  'inputs',
  'enabled',
  'use_output',
  'meta',
  'input',
  'download',
  'signed',
];

export const fullAgentPolicyToYaml = (
  policy: FullAgentPolicy,
  yaml: YamlModule,
  apiKey?: string
): string => {
  const sortYamlKeys = createYamlKeysSorter(POLICY_KEYS_ORDER, yaml);
  const yamlText = toYaml(
    policy,
    { sortMapEntries: sortYamlKeys, strict: false, schema: 'yaml-1.1' },
    yaml
  );
  const formattedYml = apiKey ? replaceApiKey(yamlText, apiKey) : yamlText;

  if (!policy?.secret_references?.length) return formattedYml;

  return _formatSecrets(policy.secret_references, formattedYml);
};

function _formatSecrets(
  secretRefs: NonNullable<FullAgentPolicy['secret_references']>,
  ymlText: string
) {
  let formattedText = ymlText;
  const secretIds = secretRefs.map((ref) => ref.id);

  secretIds.forEach((secretId, idx) => {
    const regex = new RegExp(`\\$co\\.elastic\\.secret\\{${secretId}\\}`, 'g');
    formattedText = formattedText.replace(regex, `\${SECRET_${idx}}`);
  });

  return formattedText;
}

function replaceApiKey(ymlText: string, apiKey: string) {
  const regex = new RegExp(/\$\{API_KEY}/, 'g');
  return ymlText.replace(regex, `'${apiKey}'`);
}
