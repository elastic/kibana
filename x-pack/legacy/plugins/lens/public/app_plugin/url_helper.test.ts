/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { addEmbeddableToDashboardUrl, getKibanaBasePathFromDashboardUrl } from './url_helper';

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
      `http://localhost:5601/app/kibana#/dashboard?embeddableType=${type}&embeddableId=${id}&_g=(refreshInterval:(pause:!t,value:0),time:(from:now-15m,to:now))&_a=(description:\'\',filters:!()`
    );

    url =
      "http://mybusiness.mydomain.com/app/kibana#/dashboard?_g=(refreshInterval:(pause:!t,value:0),time:(from:now-15m,to:now))&_a=(description:'',filters:!()";
    expect(addEmbeddableToDashboardUrl(url, id, type)).toEqual(
      `http://mybusiness.mydomain.com/app/kibana#/dashboard?embeddableType=${type}&embeddableId=${id}&_g=(refreshInterval:(pause:!t,value:0),time:(from:now-15m,to:now))&_a=(description:\'\',filters:!()`
    );

    url = 'http://invalidUrl';
    expect(addEmbeddableToDashboardUrl(url, id, type)).toBe(null);

    url =
      "http://localhost:5601/app/kibana#/dashboard/777182?_g=(refreshInterval:(pause:!t,value:0),time:(from:now-4h,to:now))&_a=(description:'',filters:!()";
    expect(addEmbeddableToDashboardUrl(url, id, type)).toBe(
      `http://localhost:5601/app/kibana#/dashboard/777182?embeddableType=${type}&embeddableId=${id}&_g=(refreshInterval:(pause:!t,value:0),time:(from:now-4h,to:now))&_a=(description:'',filters:!()`
    );
  });
});
