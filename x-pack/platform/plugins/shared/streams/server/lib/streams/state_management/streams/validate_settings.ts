/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient } from '@kbn/core/server';
import type { IngestStreamSettings } from '@kbn/streams-schema';
import { errors } from '@elastic/elasticsearch';
import { formatSettings } from './helpers';
import type { ValidationResult } from '../stream_active_record/stream_active_record';

interface DataStreamSettingsResponse {
  data_streams: Array<{
    name: string;
    applied_to_data_stream: boolean;
    error?: string;
  }>;
}

const SERVERLESS_SETTINGS_ALLOWLIST: (keyof IngestStreamSettings)[] = ['index.refresh_interval'];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

export function validateSettings({
  settings,
  isServerless,
}: {
  settings: IngestStreamSettings;
  isServerless: boolean;
}): ValidationResult {
  if (isServerless) {
    const disallowedSettings = Object.keys(settings).filter(
      (setting) => !SERVERLESS_SETTINGS_ALLOWLIST.includes(setting as keyof IngestStreamSettings)
    );
    if (disallowedSettings.length > 0) {
      return {
        isValid: false,
        errors: disallowedSettings.map(
          (setting) => new Error(`Setting [${setting}] is not allowed in serverless`)
        ),
      };
    }
  }

  return { isValid: true, errors: [] };
}

export async function validateSettingsWithDryRun({
  scopedClusterClient,
  streamName,
  settings,
  isServerless,
}: {
  scopedClusterClient: IScopedClusterClient;
  streamName: string;
  settings: IngestStreamSettings;
  isServerless: boolean;
}): Promise<void> {
  const formattedSettings = formatSettings(settings, isServerless);

  const settingsToValidate = Object.fromEntries(
    Object.entries(formattedSettings).filter(([_, v]) => v !== null)
  );

  if (Object.keys(settingsToValidate).length === 0) {
    return;
  }

  // When the backing Elasticsearch data stream is missing, the dry-run validation cannot run.
  // In this case we skip validation and let the real update path return the user-actionable 404.
  let response: DataStreamSettingsResponse;
  try {
    response = (await scopedClusterClient.asCurrentUser.indices.putDataStreamSettings({
      name: streamName,
      settings: settingsToValidate,
      dry_run: true,
    })) as DataStreamSettingsResponse;
  } catch (error) {
    let esErrorType = '';
    if (error instanceof errors.ResponseError) {
      const body = error.meta?.body;
      if (isRecord(body) && isRecord(body.error) && typeof body.error.type === 'string') {
        esErrorType = body.error.type;
      }
    }
    if (
      error instanceof errors.ResponseError &&
      error.statusCode === 404 &&
      (esErrorType === 'index_not_found_exception' ||
        esErrorType === 'resource_not_found_exception')
    ) {
      return;
    }
    throw error;
  }

  if (!response.data_streams || response.data_streams.length === 0) {
    throw new Error(`Failed to validate stream settings for "${streamName}"`);
  }

  const error = response.data_streams.find(({ error: err }) => Boolean(err))?.error;
  if (error) {
    if (
      error.includes('index_not_found_exception') ||
      error.includes('resource_not_found_exception') ||
      error.includes('no such index')
    ) {
      return;
    }
    throw new Error(`Invalid stream settings: ${error}`);
  }
}
