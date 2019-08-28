/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EMSFileSource } from './ems_file_source';

jest.mock('../../../kibana_services', () => {});
jest.mock('../../vector_layer', () => {});

function makeEMSFileSource(tooltipProperties) {
  const emsFileSource = new EMSFileSource({
    tooltipProperties: tooltipProperties
  });
  emsFileSource._getEMSFileLayer = () => {
    return {
      getFieldsInLanguage() {
        return [{
          name: 'iso2',
          description: 'ISO 2 CODE'
        }];
      }
    };
  };
  return emsFileSource;
}



describe('EMS file source', () => {

  it('should create tooltip-properties with human readable label', async () => {


    const mockEMSFileSource = makeEMSFileSource(['iso2']);
    const tooltipProperties = await mockEMSFileSource.filterAndFormatPropertiesToHtml({
      'iso2': 'US'
    });

    expect(tooltipProperties.length).toEqual(1);
    expect(tooltipProperties[0].getPropertyKey()).toEqual('iso2');
    expect(tooltipProperties[0].getPropertyName()).toEqual('ISO 2 CODE');
    expect(tooltipProperties[0].getHtmlDisplayValue()).toEqual('US');

  });


});
