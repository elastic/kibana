/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

jest.mock('../../../../../../src/legacy/core_plugins/kibana/public/dashboard', () => ({
  DashboardConstants: {
    ADD_EMBEDDABLE_ID: 'addEmbeddableId',
    ADD_EMBEDDABLE_TYPE: 'addEmbeddableType',
  },
}));

import {
  addEmbeddableToDashboardUrl,
  getKibanaBasePathFromDashboardUrl,
  getDashboardUrlWithoutTime,
} from './url_helper';

describe('Lens URL Helper', () => {
  it('getKibanaBasePathFromDashboardUrl', () => {
    let url =
      "http://localhost:5601/lib/app/kibana#/dashboard?_g=(refreshInterval:(pause:!t,value:0),time:(from:now-15m,to:now))&_a=(description:'',filters:!()";
    expect(getKibanaBasePathFromDashboardUrl(url)).toEqual('http://localhost:5601/lib/app/kibana#');

    url =
      'http://mybusiness.mydomain.com/lib/app/kibana#/dashboard?_g=(refreshInterval:(pause:!t,value:0),time:(from:now-15m,to:now))';
    expect(getKibanaBasePathFromDashboardUrl(url)).toEqual(
      'http://mybusiness.mydomain.com/lib/app/kibana#'
    );

    url = 'http://invalidUrl';
    expect(getKibanaBasePathFromDashboardUrl(url)).toBe(null);
  });

  it('addEmbeddableToDashboardUrl', () => {
    const id = '123eb456cd';
    const type = 'lens';
    let url =
      "http://localhost:5601/app/kibana#/dashboard?_g=(refreshInterval:(pause:!t,value:0),time:(from:now-15m,to:now))&_a=(description:'',filters:!()";
    expect(addEmbeddableToDashboardUrl(url, id, type)).toEqual(
      `http://localhost:5601/app/kibana#/dashboard?addEmbeddableType=${type}&addEmbeddableId=${id}&_g=(refreshInterval:(pause:!t,value:0),time:(from:now-15m,to:now))&_a=(description:\'\',filters:!()`
    );

    url =
      "http://mybusiness.mydomain.com/app/kibana#/dashboard?_g=(refreshInterval:(pause:!t,value:0),time:(from:now-15m,to:now))&_a=(description:'',filters:!()";
    expect(addEmbeddableToDashboardUrl(url, id, type)).toEqual(
      `http://mybusiness.mydomain.com/app/kibana#/dashboard?addEmbeddableType=${type}&addEmbeddableId=${id}&_g=(refreshInterval:(pause:!t,value:0),time:(from:now-15m,to:now))&_a=(description:\'\',filters:!()`
    );

    url = 'http://invalidUrl';
    expect(addEmbeddableToDashboardUrl(url, id, type)).toBe(null);

    url =
      "http://localhost:5601/app/kibana#/dashboard/777182?_g=(refreshInterval:(pause:!t,value:0),time:(from:now-4h,to:now))&_a=(description:'',filters:!()";
    expect(addEmbeddableToDashboardUrl(url, id, type)).toBe(
      `http://localhost:5601/app/kibana#/dashboard/777182?addEmbeddableType=${type}&addEmbeddableId=${id}&_g=(refreshInterval:(pause:!t,value:0),time:(from:now-4h,to:now))&_a=(description:'',filters:!()`
    );
  });

  it('getDashboardUrlWithoutTime', () => {
    let url =
      "http://localhost:5601/app/kibana#/dashboard?_g=(refreshInterval:(pause:!t,value:0),time:(from:now-15m,to:now))&_a=(description:'',filters:!()";
    expect(getDashboardUrlWithoutTime(url)).toEqual(
      "http://localhost:5601/app/kibana#/dashboard?_g=(refreshInterval:(pause:!t,value:0))&_a=(description:'',filters:!()"
    );
    url =
      "http://mybusiness.mydomain.com/app/kibana#/dashboard?_g=(refreshInterval:(pause:!t,value:0))&_a=(description:'',filters:!()";
    expect(getDashboardUrlWithoutTime(url)).toEqual(
      `http://mybusiness.mydomain.com/app/kibana#/dashboard?_g=(refreshInterval:(pause:!t,value:0))&_a=(description:\'\',filters:!()`
    );
    url =
      "http://mybusiness.mydomain.com/app/kibana#/dashboard?_g=(time:(from:now-15m,to:now),refreshInterval:(pause:!t,value:0))&_a=(description:'',filters:!()";
    expect(getDashboardUrlWithoutTime(url)).toEqual(
      `http://mybusiness.mydomain.com/app/kibana#/dashboard?_g=(refreshInterval:(pause:!t,value:0))&_a=(description:\'\',filters:!()`
    );
    url = 'http://notDashboarUrl';
    expect(getDashboardUrlWithoutTime(url)).toBe('http://notDashboarUrl');
    url =
      "http://localhost:5601/app/kibana#/dashboard/777182?_g=(refreshInterval:(pause:!t,value:0),time:(from:now-4h,to:now))&_a=(description:'',filters:!()";
    expect(getDashboardUrlWithoutTime(url)).toBe(
      `http://localhost:5601/app/kibana#/dashboard/777182?_g=(refreshInterval:(pause:!t,value:0))&_a=(description:'',filters:!()`
    );
  });
});
