/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parse } from 'yaml';
import { SPEC_VERSION_REGEX } from './spec_version_format';
import type { DefinitionHeader } from './types';

const CONNECTOR_ID_REGEX = /^\.[a-z0-9_-]+$/;

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/** Reads schemaVersion, id, and version from a connector definition. Does not parse the contract. */
export const parseDefinitionHeader = (yamlText: string): DefinitionHeader => {
  let value: unknown;
  try {
    value = parse(yamlText, { maxAliasCount: 0 });
  } catch (error) {
    throw new Error(`Connector definition YAML is invalid: ${errorMessage(error)}`);
  }
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Connector definition YAML must be an object');
  }
  const record = value as Record<string, unknown>;
  if (record.schemaVersion !== 1) {
    throw new Error(
      `Connector definition schemaVersion must be 1, received ${JSON.stringify(
        record.schemaVersion
      )}`
    );
  }
  if (
    typeof record.id !== 'string' ||
    !CONNECTOR_ID_REGEX.test(record.id) ||
    record.id.length > 128
  ) {
    throw new Error(`Connector definition id is invalid: ${JSON.stringify(record.id)}`);
  }
  if (typeof record.version === 'number') {
    throw new Error(
      `Connector definition version must be a quoted MAJOR.MINOR string, received number ${record.version}. Quote the version so YAML does not parse it as a float.`
    );
  }
  if (typeof record.version !== 'string' || !SPEC_VERSION_REGEX.test(record.version)) {
    throw new Error(
      `Connector definition version must use the MAJOR.MINOR form: ${JSON.stringify(
        record.version
      )}`
    );
  }
  return { schemaVersion: 1, id: record.id, version: record.version };
};
