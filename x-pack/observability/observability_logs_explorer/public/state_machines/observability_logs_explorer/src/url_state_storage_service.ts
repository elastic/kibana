/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IToasts } from '@kbn/core-notifications-browser';
import { createPlainError, formatErrors } from '@kbn/io-ts-utils';
import { IKbnUrlStateStorage, withNotifyOnErrors } from '@kbn/kibana-utils-plugin/public';
import * as Either from 'fp-ts/lib/Either';
import * as rt from 'io-ts';
import { InvokeCreator } from 'xstate';
import { OBSERVABILITY_LOGS_EXPLORER_URL_STATE_KEY } from '../../../../common';
import type { ObservabilityLogsExplorerContext, ObservabilityLogsExplorerEvent } from './types';
import * as urlSchemaV1 from './url_schema_v1';
import * as urlSchemaV2 from './url_schema_v2';

interface ObservabilityLogsExplorerUrlStateDependencies {
  toastsService: IToasts;
  urlStateStorageContainer: IKbnUrlStateStorage;
}

export const updateUrlFromLogsExplorerState =
  ({ urlStateStorageContainer }: { urlStateStorageContainer: IKbnUrlStateStorage }) =>
  (context: ObservabilityLogsExplorerContext, event: ObservabilityLogsExplorerEvent) => {
    if (!('logsExplorerState' in context)) {
      return;
    }

    // we want to write in the newest schema
    const encodedUrlStateValues = urlSchemaV2.stateFromUntrustedUrlRT.encode(
      context.logsExplorerState
    );

    urlStateStorageContainer.set(OBSERVABILITY_LOGS_EXPLORER_URL_STATE_KEY, encodedUrlStateValues, {
      replace: true,
    });
  };

export const initializeFromUrl =
  ({
    toastsService,
    urlStateStorageContainer,
  }: ObservabilityLogsExplorerUrlStateDependencies): InvokeCreator<
    ObservabilityLogsExplorerContext,
    ObservabilityLogsExplorerEvent
  > =>
  (_context, _event) =>
  (send) => {
    const urlStateValues =
      urlStateStorageContainer.get<unknown>(OBSERVABILITY_LOGS_EXPLORER_URL_STATE_KEY) ?? undefined;

    // in the future we'll have to more schema versions to the union
    const stateValuesE = rt
      .union([
        rt.undefined,
        urlSchemaV1.stateFromUntrustedUrlRT,
        urlSchemaV2.stateFromUntrustedUrlRT,
      ])
      .decode(urlStateValues);

    if (Either.isLeft(stateValuesE)) {
      withNotifyOnErrors(toastsService).onGetError(
        createPlainError(formatErrors(stateValuesE.left))
      );
      send({
        type: 'INITIALIZED_FROM_URL',
        stateFromUrl: undefined,
      });
    } else {
      send({
        type: 'INITIALIZED_FROM_URL',
        stateFromUrl: stateValuesE.right,
      });
    }
  };
