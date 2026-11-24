/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OtlpExporterConfig } from '../../../common/types';
import { isManagedOtlpEndpointUrl } from '../../../common/services/managed_otlp_endpoint';
import {
  getOtlpSendingQueueSizeError,
  mergeOtlpSendingQueue,
  withManagedOtlpQueueDefaults,
} from '../../../common/services/otlp_sending_queue';
import type { OtlpSendingQueue } from '../../../common/services/otlp_sending_queue';
import { OutputInvalidError } from '../../errors';

import { appContextService } from '..';

export const getManagedOtlpEndpoint = (): string | undefined => {
  return appContextService.getCloud()?.managedOtlp?.url;
};

export const isManagedOtlpEndpoint = (endpoint: string): boolean =>
  isManagedOtlpEndpointUrl(endpoint, getManagedOtlpEndpoint());

/**
 * Fills the settings of the sending queue that are not set, left out or `null`, with the ones that
 * Elastic recommends, when the endpoint is the managed OTLP endpoint. The settings that are set
 * are kept.
 *
 * A `null` block is an explicit opt-out and is kept: `sending_queue: null` leaves the queue to the
 * spec defaults, and `batch: null` turns batching off.
 *
 * The recommended sizes are in bytes, so they are only set for a queue or a batch that counts
 * bytes, and only when they fit with the sizes that are set.
 */
export const applyManagedOtlpDefaults = (exporter: OtlpExporterConfig): OtlpExporterConfig => {
  if (!isManagedOtlpEndpoint(exporter.endpoint) || exporter.sending_queue === null) {
    return exporter;
  }
  return {
    ...exporter,
    sending_queue: withManagedOtlpQueueDefaults(exporter.sending_queue),
  } as OtlpExporterConfig;
};

/**
 * Checks the sizes of the sending queue that an output gets once it is saved: the stored queue with
 * the update merged into it. Sizes that the collector rejects are an error, except for a
 * preconfigured output, which only logs a warning so that it does not stop the Fleet setup.
 */
export const validateOtlpSendingQueueSizes = ({
  update,
  stored,
  fromPreconfiguration,
}: {
  update: OtlpSendingQueue | null | undefined;
  stored?: OtlpSendingQueue | null;
  fromPreconfiguration: boolean;
}) => {
  const error = getOtlpSendingQueueSizeError(mergeOtlpSendingQueue(stored, update));
  if (!error) {
    return;
  }
  if (fromPreconfiguration) {
    appContextService
      .getLogger()
      .warn(`The OTLP output has a sending queue that the collector rejects: ${error}`);
    return;
  }
  throw new OutputInvalidError(error);
};
