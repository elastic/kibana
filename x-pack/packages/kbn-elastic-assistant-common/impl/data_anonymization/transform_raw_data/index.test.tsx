/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockGetAnonymizedValue } from '../../mock/get_anonymized_value';
import { transformRawData } from '.';

describe('transformRawData', () => {
  it('returns non-anonymized data when rawData is a string', () => {
    const inputRawData = {
      allow: ['field1'],
      allowReplacement: ['field1', 'field2'],
      promptContextId: 'abcd',
      rawData: 'this will not be anonymized',
    };

    const result = transformRawData({
      allow: inputRawData.allow,
      allowReplacement: inputRawData.allowReplacement,
      currentReplacements: [],
      getAnonymizedValue: mockGetAnonymizedValue,
      onNewReplacements: () => {},
      rawData: inputRawData.rawData,
    });

    expect(result).toEqual('this will not be anonymized');
  });

  it('calls onNewReplacements with the expected replacements', () => {
    const inputRawData = {
      allow: ['field1'],
      allowReplacement: ['field1'],
      promptContextId: 'abcd',
      rawData: { field1: ['value1'] },
    };

    const onNewReplacements = jest.fn();

    transformRawData({
      allow: inputRawData.allow,
      allowReplacement: inputRawData.allowReplacement,
      currentReplacements: [],
      getAnonymizedValue: mockGetAnonymizedValue,
      onNewReplacements,
      rawData: inputRawData.rawData,
    });

    expect(onNewReplacements).toHaveBeenCalledWith([{ uuid: '1eulav', value: 'value1' }]);
  });

  it('returns the expected mix of anonymized and non-anonymized data as a CSV string', () => {
    const inputRawData = {
      allow: ['field1', 'field2'],
      allowReplacement: ['field1'], // only field 1 will be anonymized
      promptContextId: 'abcd',
      rawData: { field1: ['value1', 'value2'], field2: ['value3', 'value4'] },
    };

    const result = transformRawData({
      allow: inputRawData.allow,
      allowReplacement: inputRawData.allowReplacement,
      currentReplacements: [],
      getAnonymizedValue: mockGetAnonymizedValue,
      onNewReplacements: () => {},
      rawData: inputRawData.rawData,
    });

    expect(result).toEqual('field1,1eulav,2eulav\nfield2,value3,value4'); // only field 1 is anonymized
  });

  it('omits fields that are not included in the `allow` list, even if they are members of `allowReplacement`', () => {
    const inputRawData = {
      allow: ['field1', 'field2'], // field3 is NOT allowed
      allowReplacement: ['field1', 'field3'], // field3 is requested to be anonymized
      promptContextId: 'abcd',
      rawData: {
        field1: ['value1', 'value2'],
        field2: ['value3', 'value4'],
        field3: ['value5', 'value6'], // this data should NOT be included in the output
      },
    };

    const result = transformRawData({
      allow: inputRawData.allow,
      allowReplacement: inputRawData.allowReplacement,
      currentReplacements: [],
      getAnonymizedValue: mockGetAnonymizedValue,
      onNewReplacements: () => {},
      rawData: inputRawData.rawData,
    });

    expect(result).toEqual('field1,1eulav,2eulav\nfield2,value3,value4'); // field 3 is not included
  });
});
