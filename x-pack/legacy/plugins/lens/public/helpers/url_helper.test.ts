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

import { addEmbeddableToDashboardUrl, getUrlVars } from './url_helper';

describe('Dashboard URL Helper', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('addEmbeddableToDashboardUrl', () => {
    const id = '123eb456cd';
    const urlVars = {
      x: '1',
      y: '2',
      z: '3',
    };
    const basePath = '/pep';
    const url =
      "http://localhost:5601/pep/app/kibana#/dashboard?_g=(refreshInterval:(pause:!t,value:0),time:(from:now-15m,to:now))&_a=(description:'',filters:!()";
    expect(addEmbeddableToDashboardUrl(url, basePath, id, urlVars)).toEqual(
      `http://localhost:5601/pep/app/kibana#/dashboard?addEmbeddableType=lens&addEmbeddableId=${id}&x=1&y=2&z=3`
    );
  });

  it('getUrlVars', () => {
    let url =
      "http://localhost:5601/app/kibana#/dashboard?_g=(refreshInterval:(pause:!t,value:0),time:(from:now-15m,to:now))&_a=(description:'',filters:!()";
    expect(getUrlVars(url)).toEqual({
      _g: '(refreshInterval:(pause:!t,value:0),time:(from:now-15m,to:now))',
      _a: "(description:'',filters:!()",
    });
    url = 'http://mybusiness.mydomain.com/app/kibana#/dashboard?x=y&y=z';
    expect(getUrlVars(url)).toEqual({
      x: 'y',
      y: 'z',
    });
    url = 'http://localhost:5601/app/kibana#/dashboard/777182';
    expect(getUrlVars(url)).toEqual({});
    url =
      'http://localhost:5601/app/kibana#/dashboard/777182?title=Some%20Dashboard%20With%20Spaces';
    expect(getUrlVars(url)).toEqual({ title: 'Some Dashboard With Spaces' });
  });
});
