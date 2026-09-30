/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import deepEqual from 'fast-deep-equal';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';

import { isBeatsOutput } from '../../../common/services/output_helpers';
import { outputType } from '../../../common/constants';
import { SERVERLESS_DEFAULT_OUTPUT_ID, SERVERLESS_PRIVATE_OUTPUT_ID } from '../../constants';
import type { NewBeatsOutput, UpdateTypedOutput } from '../../../common/types';
import type { NewOutput } from '../../../common';
import type { Output } from '../../types';
import { OutputInvalidError } from '../../errors';
import { appContextService } from '../app_context';
import { throwIfSslPathInvalid } from '../../routes/utils/ssl_utils';

export const validateOutputSslPaths = (output: Partial<NewBeatsOutput>): void => {
  throwIfSslPathInvalid(
    [
      ...(output.ssl?.certificate_authorities ?? []),
      output.ssl?.certificate,
      output.ssl?.key,
      output.secrets?.ssl?.key,
    ],
    (m) => new OutputInvalidError(m)
  );
};

export const ensureNoDuplicateSecrets = (output: UpdateTypedOutput | NewOutput): void => {
  if (output.type === outputType.Kafka && output?.password && output?.secrets?.password) {
    throw new OutputInvalidError('Cannot specify both password and secrets.password');
  }
  if (isBeatsOutput(output) && output.ssl?.key && output.secrets?.ssl?.key) {
    throw new OutputInvalidError('Cannot specify both ssl.key and secrets.ssl.key');
  }
  if (
    output.type === outputType.RemoteElasticsearch &&
    output.service_token &&
    output.secrets?.service_token
  ) {
    throw new OutputInvalidError('Cannot specify both service_token and secrets.service_token');
  }
};

export const validateOutputServerless = async (
  outputSvc: { get(id: string): Promise<Output> },
  output: UpdateTypedOutput | NewOutput,
  outputId?: string
): Promise<void> => {
  const cloudSetup = appContextService.getCloud();
  if (!cloudSetup?.isServerlessEnabled) {
    return;
  }
  // On update, skip serverless host check if hosts are not being changed.
  if (outputId && !('hosts' in output)) {
    return;
  }
  // Preconfigured outputs in serverless are authoritative.
  if ('is_preconfigured' in output && output.is_preconfigured) {
    return;
  }
  let originalOutput: Output | undefined;
  if (outputId) {
    originalOutput = await outputSvc.get(outputId);
    if (originalOutput.is_preconfigured) {
      return;
    }
  }
  const type = output.type || originalOutput?.type;
  if (type !== outputType.Elasticsearch) {
    return;
  }
  if (!('hosts' in output)) {
    return;
  }
  let defaultOutput: Output;
  try {
    defaultOutput = await outputSvc.get(SERVERLESS_DEFAULT_OUTPUT_ID);
  } catch (e) {
    if (!SavedObjectsErrorHelpers.isNotFoundError(e)) {
      throw e;
    }
    appContextService.getLogger().debug(`Default ES output SO not found: ${e?.message ?? e}`);
    return;
  }
  if (defaultOutput.type !== outputType.Elasticsearch) {
    return;
  }
  if (deepEqual(output.hosts, defaultOutput.hosts)) {
    return;
  }
  try {
    const privateOutput = await outputSvc.get(SERVERLESS_PRIVATE_OUTPUT_ID);
    if (
      privateOutput.type === outputType.Elasticsearch &&
      deepEqual(output.hosts, privateOutput.hosts) &&
      outputId === SERVERLESS_PRIVATE_OUTPUT_ID
    ) {
      return;
    }
  } catch (e) {
    if (!SavedObjectsErrorHelpers.isNotFoundError(e)) {
      throw e;
    }
    appContextService.getLogger().debug(`Private ES output SO not found: ${e?.message ?? e}`);
  }
  throw new OutputInvalidError(
    `Elasticsearch output host must have default URL in serverless: ${defaultOutput.hosts}`
  );
};
