/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getHelpText } from './stream_name_form_row';

const prefix = 'logs.';

describe('getHelpText', () => {
  it('should return empty error help text when stream name is shorter than the prefix', () => {
    const streamNameWithEmptyChildName = 'logs.';
    const result = getHelpText(prefix, streamNameWithEmptyChildName, false);
    expect(result).toBe('Stream name must not be empty.');
  });

  it('should return name too long error help text when stream name is longer than 200 characters', () => {
    const streamNameLongerThan200Chars =
      'logs.xwdaqmsegtkamcrofcfcomnlkkkrkqtlkbqizvjvtrbwereqygqaaxmodzccqipzpwymyowrtvljtxevczoohrbpgijilsdptszgssmrkpwhvkukkgiqhvmcuzygmolyyadbxwngbkqjkretmzhgntkjkhrmltgyurufizwlelvmaqtngwhwqhxpfsuxiivxspvtwfcem';
    const result = getHelpText(prefix, streamNameLongerThan200Chars, false);
    expect(result).toBe('Stream name cannot be longer than 200 characters.');
  });

  it('should return undefined help text when input is valid', () => {
    const validStreamName = 'logs.multiplayer';
    const result = getHelpText(prefix, validStreamName, false);
    expect(result).toBeUndefined();
  });
});
