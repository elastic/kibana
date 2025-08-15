/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IToasts } from '@kbn/core-notifications-browser';
import type { DatasetQualityPublicState } from '@kbn/dataset-quality-plugin/public/controller/dataset_quality';
import { createPlainError, formatErrors } from '@kbn/io-ts-utils';
import type { IKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import { withNotifyOnErrors } from '@kbn/kibana-utils-plugin/public';
import * as Either from 'fp-ts/Either';
import * as rt from 'io-ts';
import { DATA_QUALITY_URL_STATE_KEY } from '../../../common/url_schema';
import * as urlSchemaV1 from './url_schema_v1';
import * as urlSchemaV2 from './url_schema_v2';

export const updateUrlFromDatasetQualityState = ({
  urlStateStorageContainer,
  datasetQualityState,
}: {
  urlStateStorageContainer: IKbnUrlStateStorage;
  datasetQualityState?: DatasetQualityPublicState;
}) => {
  if (!datasetQualityState) {
    return;
  }

  // we want to use always the newest schema version
  const encodedUrlStateValues = urlSchemaV2.stateFromUntrustedUrlRT.encode(datasetQualityState);

  urlStateStorageContainer.set(DATA_QUALITY_URL_STATE_KEY, encodedUrlStateValues, {
    replace: true,
  });
};

export const getDatasetQualityStateFromUrl = ({
  toastsService,
  urlStateStorageContainer,
}: {
  toastsService: IToasts;
  urlStateStorageContainer: IKbnUrlStateStorage;
}): Partial<DatasetQualityPublicState> | undefined => {
  const urlStateValues =
    urlStateStorageContainer.get<unknown>(DATA_QUALITY_URL_STATE_KEY) ?? undefined;

  const stateValuesE = rt
    .union([rt.undefined, urlSchemaV1.stateFromUntrustedUrlRT, urlSchemaV2.stateFromUntrustedUrlRT])
    .decode(urlStateValues);

  if (Either.isLeft(stateValuesE)) {
    withNotifyOnErrors(toastsService).onGetError(createPlainError(formatErrors(stateValuesE.left)));
    return undefined;
  } else {
    return stateValuesE.right;
  }
};
