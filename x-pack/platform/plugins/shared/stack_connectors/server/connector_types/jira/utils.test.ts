/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { escapeJqlSpecialCharacters } from './utils';

describe('escapeJqlSpecialCharacters', () => {
  it('should escape jql special characters', () => {
    const str = '[th!s^is()a-te+st-{~is*s&ue?or|and\\bye:}]"}]';
    const escapedStr = escapeJqlSpecialCharacters(str);
    expect(escapedStr).toEqual(
      '\\\\[th\\\\!s\\\\^is\\\\(\\\\)a\\\\-te\\\\+st\\\\-\\\\{\\\\~is\\\\*s\\\\&ue\\\\?or\\\\|and\\\\bye\\\\:\\\\}\\\\]\\\\}\\\\]'
    );
  });

  it('should remove double quotes', () => {
    const str = '"Hello"';
    const escapedStr = escapeJqlSpecialCharacters(str);
    expect(escapedStr).toEqual('Hello');
  });

  it('should replace single quotes with backslash', () => {
    const str = "Javascript's beauty is simplicity!";
    const escapedStr = escapeJqlSpecialCharacters(str);
    expect(escapedStr).toEqual('Javascript\\\\s beauty is simplicity\\\\!');
  });

  it('should replace single backslash with four backslash', () => {
    const str = '\\I have one backslash';
    const escapedStr = escapeJqlSpecialCharacters(str);
    expect(escapedStr).toEqual('\\\\I have one backslash');
  });

  it('should not escape other special characters', () => {
    const str = '<it is, a test.>';
    const escapedStr = escapeJqlSpecialCharacters(str);
    expect(escapedStr).toEqual('<it is, a test.>');
  });

  it('should not escape alpha numeric characters', () => {
    const str = 'here is a case 29';
    const escapedStr = escapeJqlSpecialCharacters(str);
    expect(escapedStr).toEqual('here is a case 29');
  });

  it('should not escape unicode spaces', () => {
    const str = 'comm\u2000=\u2001"hello"\u3000';
    const escapedStr = escapeJqlSpecialCharacters(str);
    expect(escapedStr).toEqual('comm = hello　');
  });

  it('should not escape non ASCII characters', () => {
    const str = 'Apple’s amazing idea♥';
    const escapedStr = escapeJqlSpecialCharacters(str);
    expect(escapedStr).toEqual('Apple’s amazing idea♥');
  });
});
