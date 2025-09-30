/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IToasts } from '@kbn/core-notifications-browser';
import type { DatasetQualityDetailsPublicState } from '@kbn/dataset-quality-plugin/public/controller/dataset_quality_details';
import { createPlainError, formatErrors } from '@kbn/io-ts-utils';
import type { IKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import { withNotifyOnErrors } from '@kbn/kibana-utils-plugin/public';
import * as Either from 'fp-ts/Either';
import type { DatasetQualityDetailsPublicStateUpdate } from '@kbn/dataset-quality-plugin/public/controller/dataset_quality_details';
import * as rt from 'io-ts';
import { DATA_QUALITY_URL_STATE_KEY } from '@kbn/data-quality/common';
import { datasetQualityDetailsSerializationSchemaV1 as urlSchemaV1 } from '@kbn/data-quality/public';
import { datasetQualityDetailsSerializationSchemaV2 as urlSchemaV2 } from '@kbn/data-quality/public';

export const updateUrlFromDatasetQualityDetailsState = ({
  urlStateStorageContainer,
  datasetQualityDetailsState,
  setTime,
  setRefreshInterval,
}: {
  urlStateStorageContainer: IKbnUrlStateStorage;
  datasetQualityDetailsState?: DatasetQualityDetailsPublicState;
  setTime: (time: { from: string; to: string }) => void;
  setRefreshInterval: ({ value, pause }: { value: number; pause: boolean }) => void;
}) => {
  if (!datasetQualityDetailsState) {
    return;
  }

  // we want to use always the newest schema version
  const encodedUrlStateValues = urlSchemaV2.stateFromUntrustedUrlRT.encode(
    datasetQualityDetailsState
  );

  urlStateStorageContainer.set(DATA_QUALITY_URL_STATE_KEY, encodedUrlStateValues, {
    replace: true,
  });

  const { timeRange } = datasetQualityDetailsState;
  if (timeRange?.from && timeRange?.to) {
    setTime({ from: timeRange.from, to: timeRange.to });
  }
  if (timeRange.refresh) {
    setRefreshInterval(timeRange.refresh);
  }
};

/*
 * This function is used to get the dataset quality details state from the URL.
 * It will return `null` if the URL state is not present or `undefined` if the URL state is present but invalid.
 */
export const getDatasetQualityDetailsStateFromUrl = ({
  toastsService,
  urlStateStorageContainer,
}: {
  toastsService: IToasts;
  urlStateStorageContainer: IKbnUrlStateStorage;
}): DatasetQualityDetailsPublicStateUpdate | undefined | null => {
  const urlStateValues =
    urlStateStorageContainer.get<unknown>(DATA_QUALITY_URL_STATE_KEY) ?? undefined;

  const stateValuesE = rt
    .union([rt.undefined, urlSchemaV1.stateFromUntrustedUrlRT, urlSchemaV2.stateFromUntrustedUrlRT])
    .decode(urlStateValues);

  if (Either.isLeft(stateValuesE)) {
    withNotifyOnErrors(toastsService).onGetError(createPlainError(formatErrors(stateValuesE.left)));
    return undefined;
  } else {
    return stateValuesE.right ?? null;
  }
};
