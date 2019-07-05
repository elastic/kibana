/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EMSFileSource } from './ems_file_source';

jest.mock('../../../../kibana_services', () => {});
jest.mock('../../vector_layer', () => {});

class MockEMSFileSource {

  constructor(emsFileSource) {
    this._emsFileSource = emsFileSource;
    this._emsFileSource._getEmsVectorFileMeta = () => {
      return {
        fields: [{
          name: 'iso2',
          description: 'ISO 2 CODE'
        }]
      };
    };
  }

  async filterAndFormatPropertiesToHtml(props) {
    return await this._emsFileSource.filterAndFormatPropertiesToHtml(props);
  }

}


describe('EMS file source', () => {

  it('should create tooltip-properties with human readable label', async () => {

    const emsFileSource = new EMSFileSource({
      tooltipProperties: ['iso2']
    });
    const mockEMSFileSource = new MockEMSFileSource(emsFileSource);

    const tooltipProperties = await mockEMSFileSource.filterAndFormatPropertiesToHtml({
      'iso2': 'US'
    });

    expect(tooltipProperties.length).toEqual(1);
    expect(tooltipProperties[0].getPropertyKey()).toEqual('iso2');
    expect(tooltipProperties[0].getPropertyName()).toEqual('ISO 2 CODE');
    expect(tooltipProperties[0].getHtmlDisplayValue()).toEqual('US');

  });


});
