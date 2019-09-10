/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Location } from 'history';
import React from 'react';
import { getRenderedHref } from '../../../../utils/testHelpers';
import { MLJobLink } from './MLJobLink';
import * as kibanaCore from '../../../../../../observability/public/context/kibana_core';
import { InternalCoreStart } from 'src/core/public';

describe('MLJobLink', () => {
  beforeEach(() => {
    const coreMock = ({
      http: {
        basePath: {
          prepend: (path: string) => `/basepath${path}`
        }
      }
    } as unknown) as InternalCoreStart;

    spyOn(kibanaCore, 'useKibanaCore').and.returnValue(coreMock);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });
  it('should produce the correct URL', async () => {
    const href = await getRenderedHref(
      () => (
        <MLJobLink
          serviceName="myServiceName"
          transactionType="myTransactionType"
        />
      ),
      { search: '?rangeFrom=now/w&rangeTo=now-4h' } as Location
    );

    expect(href).toEqual(
      `/basepath/app/ml#/timeseriesexplorer?_g=(ml:(jobIds:!(myservicename-mytransactiontype-high_mean_response_time)),refreshInterval:(pause:true,value:'0'),time:(from:now%2Fw,to:now-4h))`
    );
  });
});
