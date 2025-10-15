/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateBlockkit, validateChannelName } from './schema';

describe('Slack schema validations', () => {
  describe('validateBlockkit', () => {
    test('should return error for invalid json', () => {
      expect(validateBlockkit('')).toEqual(
        `block kit body is not valid JSON - Unexpected end of JSON input`
      );
      expect(validateBlockkit('abc')).toEqual(
        `block kit body is not valid JSON - Unexpected token 'a', \"abc\" is not valid JSON`
      );
    });

    test('should return error for json that does not contain the "blocks" field', () => {
      expect(validateBlockkit(JSON.stringify({ foo: 'bar' }))).toEqual(
        `block kit body must contain field \"blocks\"`
      );
    });

    test('should return nothing for valid blockkit text', () => {
      expect(
        validateBlockkit(
          JSON.stringify({
            blocks: [
              {
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text: 'Hello',
                },
              },
            ],
          })
        )
      ).toBeUndefined();
    });
  });

  describe('Validate channel name', () => {
    test('should return error if the channel name does not start with #', () => {
      expect(validateChannelName('general')).toBe('Channel name must start with #');
    });

    test('should return undefined for valid channel names starting with #', () => {
      expect(validateChannelName('#general')).toBeUndefined();
      expect(validateChannelName('#channel-123')).toBeUndefined();
    });

    test('should handle channel names with special characters', () => {
      expect(validateChannelName('#test-team')).toBeUndefined();
      expect(validateChannelName('#incident-*')).toBeUndefined();
    });
  });
});
