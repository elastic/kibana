/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { X_ELASTIC_INTERNAL_ORIGIN_REQUEST } from '@kbn/core-http-common';
import { ActionSourceTypes } from '../../common/types/domain';
import { getDefaultActionSource } from './get_default_action_source';

describe('getDefaultActionSource', () => {
  it('returns api when the request is not internal', () => {
    expect(getDefaultActionSource(httpServerMock.createKibanaRequest())).toEqual({
      type: ActionSourceTypes.api,
      id: ActionSourceTypes.api,
    });
  });

  it('returns api when kbn-version is present without the internal origin header', () => {
    const request = httpServerMock.createKibanaRequest({
      headers: { 'kbn-version': '9.6.0' },
    });

    expect(getDefaultActionSource(request)).toEqual({
      type: ActionSourceTypes.api,
      id: ActionSourceTypes.api,
    });
  });

  it('returns user when the request carries the internal origin header', () => {
    const request = httpServerMock.createKibanaRequest({
      headers: { [X_ELASTIC_INTERNAL_ORIGIN_REQUEST]: 'Kibana' },
    });

    expect(getDefaultActionSource(request)).toEqual({
      type: ActionSourceTypes.user,
      id: ActionSourceTypes.user,
    });
  });
});
