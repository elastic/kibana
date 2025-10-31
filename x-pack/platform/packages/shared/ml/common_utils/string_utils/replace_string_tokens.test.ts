/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MlCustomUrlAnomalyRecordDoc } from '@kbn/ml-anomaly-utils';

import { replaceStringTokens } from './replace_string_tokens';

describe('replaceStringTokens', () => {
  const testRecord: MlCustomUrlAnomalyRecordDoc = {
    job_id: 'test_job',
    result_type: 'record',
    probability: 0.0191711,
    record_score: 4.3,
    bucket_span: 300,
    detector_index: 0,
    timestamp: 1454890500000,
    function: 'mean',
    function_description: 'mean',
    field_name: 'responsetime',
    user: "Des O'Connor",
    testfield1: 'test$tring=[+-?]',
    testfield2: '{<()>}',
    testfield3: 'host=\\\\test@uk.dev',
    earliest: '0',
    latest: '0',
    is_interim: false,
    initial_record_score: 0,
  };

  test('should return correct values without URI encoding', () => {
    const result = replaceStringTokens('user=$user$,time=$timestamp$', testRecord, false);
    expect(result).toBe("user=Des O'Connor,time=1454890500000");
  });

  test('should return correct values for missing token without URI encoding', () => {
    const result = replaceStringTokens('user=$username$,time=$timestamp$', testRecord, false);
    expect(result).toBe('user=$username$,time=1454890500000');
  });

  test('should return correct values with URI encoding', () => {
    const testString1 = 'https://www.google.co.uk/webhp#q=$testfield1$';
    const testString2 = 'https://www.google.co.uk/webhp#q=$testfield2$';
    const testString3 = 'https://www.google.co.uk/webhp#q=$testfield3$';
    const testString4 = 'https://www.google.co.uk/webhp#q=$user$';

    const result1 = replaceStringTokens(testString1, testRecord, true);
    const result2 = replaceStringTokens(testString2, testRecord, true);
    const result3 = replaceStringTokens(testString3, testRecord, true);
    const result4 = replaceStringTokens(testString4, testRecord, true);

    expect(result1).toBe('https://www.google.co.uk/webhp#q=test%24tring%3D%5B%2B-%3F%5D');
    expect(result2).toBe('https://www.google.co.uk/webhp#q=%7B%3C()%3E%7D');
    expect(result3).toBe('https://www.google.co.uk/webhp#q=host%3D%5C%5Ctest%40uk.dev');
    expect(result4).toBe("https://www.google.co.uk/webhp#q=Des%20O'Connor");
  });

  test('should return correct values for missing token with URI encoding', () => {
    const testString = 'https://www.google.co.uk/webhp#q=$username$&time=$timestamp$';
    const result = replaceStringTokens(testString, testRecord, true);
    expect(result).toBe('https://www.google.co.uk/webhp#q=$username$&time=1454890500000');
  });
});
