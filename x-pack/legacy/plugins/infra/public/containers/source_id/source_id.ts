/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as runtimeTypes from 'io-ts';

import { useUrlState, replaceStateKeyInQueryString } from '../../utils/use_url_state';

const SOURCE_ID_URL_STATE_KEY = 'sourceId';

export const useSourceId = () => {
  return useUrlState({
    defaultState: 'default',
    decodeUrlState: decodeSourceIdUrlState,
    encodeUrlState: encodeSourceIdUrlState,
    urlStateKey: SOURCE_ID_URL_STATE_KEY,
  });
};

export const replaceSourceIdInQueryString = (sourceId: string) =>
  replaceStateKeyInQueryString(SOURCE_ID_URL_STATE_KEY, sourceId);

const sourceIdRuntimeType = runtimeTypes.union([runtimeTypes.string, runtimeTypes.undefined]);
const encodeSourceIdUrlState = sourceIdRuntimeType.encode;
const decodeSourceIdUrlState = (value: unknown) =>
  sourceIdRuntimeType.decode(value).getOrElse(undefined);
