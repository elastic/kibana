/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { addLensToDashboardUrl, getKibanaBasePathFromDashboardUrl } from './url_helper';

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

  it('addLensToDashboardUrl', () => {
    const id = '123eb456cd';
    let url =
      "http://localhost:5601/lib/app/kibana#/dashboard?_g=(refreshInterval:(pause:!t,value:0),time:(from:now-15m,to:now))&_a=(description:'',filters:!()";
    expect(addLensToDashboardUrl(url, id)).toEqual(
      `http://localhost:5601/lib/app/kibana#/dashboard?addLens=${id}&_g=(refreshInterval:(pause:!t,value:0),time:(from:now-15m,to:now))&_a=(description:\'\',filters:!()`
    );

    url =
      "http://mybusiness.mydomain.com/lib/app/kibana#/dashboard?_g=(refreshInterval:(pause:!t,value:0),time:(from:now-15m,to:now))&_a=(description:'',filters:!()";
    expect(addLensToDashboardUrl(url, id)).toEqual(
      `http://mybusiness.mydomain.com/lib/app/kibana#/dashboard?addLens=${id}&_g=(refreshInterval:(pause:!t,value:0),time:(from:now-15m,to:now))&_a=(description:\'\',filters:!()`
    );

    url = 'http://invalidUrl';
    expect(addLensToDashboardUrl(url, id)).toBe(null);

    expect(addLensToDashboardUrl(undefined, id)).toBe(null);
  });
});
