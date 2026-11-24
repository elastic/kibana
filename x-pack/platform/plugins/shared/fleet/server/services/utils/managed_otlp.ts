/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isPlainObject, mergeWith } from 'lodash';

import { MANAGED_OTLP_EXPORTER_DEFAULTS } from '../../../common/constants/output';
import type { OtlpExporterConfig } from '../../../common/types';
import { isManagedOtlpEndpointUrl } from '../../../common/services/managed_otlp_endpoint';
import {
  getOtlpSendingQueueSizeError,
  mergeOtlpSendingQueue,
  withRemovedStoredSettings,
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
 * Deep-merges managed-OTLP sending_queue defaults into the exporter config when the endpoint
 * points at the managed OTLP service. User-supplied fields win at every level, and a setting that
 * is left out or `null` gets the default.
 *
 * A `null` block is an explicit opt-out and is kept: `sending_queue: null` leaves the queue to the
 * spec defaults, and `batch: null` turns batching off.
 *
 * Uses lodash mergeWith with an array-replacement customizer (same pattern as otel_collector.ts)
 * so that array values are replaced wholesale rather than concatenated.
 */
export const applyManagedOtlpDefaults = (exporter: OtlpExporterConfig): OtlpExporterConfig => {
  if (!isManagedOtlpEndpoint(exporter.endpoint) || exporter.sending_queue === null) {
    return exporter;
  }
  return {
    ...exporter,
    sending_queue: mergeWith(
      {},
      MANAGED_OTLP_EXPORTER_DEFAULTS.sending_queue,
      exporter.sending_queue,
      (dst: unknown, src: unknown) => {
        if (Array.isArray(src)) {
          return src;
        }
        if (src === null) {
          return isPlainObject(dst) ? null : dst;
        }
      }
    ),
  };
};

/**
 * Checks the sizes of the sending queue of an output. Sizes that the collector rejects are an error,
 * except for a preconfigured output, which only logs a warning so that it does not stop the Fleet
 * setup.
 */
export const validateOtlpSendingQueueSizes = ({
  queue,
  fromPreconfiguration,
}: {
  queue: OtlpSendingQueue | null | undefined;
  fromPreconfiguration: boolean;
}) => {
  const error = getOtlpSendingQueueSizeError(queue);
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

/**
 * The exporter of an update of an OTLP output. The update of the sending queue is merged into the
 * stored queue first, so the defaults of the managed endpoint only fill what neither sets, and the
 * sizes are checked as they are saved. The whole queue is then written, with the stored settings it
 * no longer has set to `null`.
 */
export const getOtlpExporterUpdate = ({
  update,
  stored,
  fromPreconfiguration,
}: {
  update: OtlpExporterConfig;
  stored: OtlpExporterConfig | undefined;
  fromPreconfiguration: boolean;
}): OtlpExporterConfig => {
  const storedQueue = stored?.sending_queue;
  const exporter = applyManagedOtlpDefaults({
    ...update,
    sending_queue: mergeOtlpSendingQueue(storedQueue, update.sending_queue),
  } as OtlpExporterConfig);
  validateOtlpSendingQueueSizes({ queue: exporter.sending_queue, fromPreconfiguration });
  if (exporter.sending_queue === undefined) {
    return update;
  }
  return {
    ...update,
    sending_queue: withRemovedStoredSettings(exporter.sending_queue, storedQueue),
  } as OtlpExporterConfig;
};
