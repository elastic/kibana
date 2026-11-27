/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parse } from 'yaml';
import {
  readTriggerEventSettings,
  writeTriggerCondition,
  writeTriggerConnectorId,
} from './trigger_event_fragment';

describe('trigger_event_fragment', () => {
  describe('readTriggerEventSettings', () => {
    it('reads the connector id and the condition', () => {
      expect(
        readTriggerEventSettings({
          type: 'github.issues',
          'connector-id': '*',
          on: { condition: 'body.action: "opened"' },
        })
      ).toEqual({ connectorId: '*', condition: 'body.action: "opened"' });
    });

    it('reads absent settings as empty text', () => {
      expect(readTriggerEventSettings({ type: 'github.issues' })).toEqual({
        connectorId: '',
        condition: '',
      });
      expect(readTriggerEventSettings(undefined)).toEqual({ connectorId: '', condition: '' });
    });
  });

  describe('writeTriggerConnectorId', () => {
    it('sets the key, quoting the wildcard so it is not a YAML alias', () => {
      const written = writeTriggerConnectorId('type: github.issues\n', '*', 2);

      expect(parse(written)).toEqual({ type: 'github.issues', 'connector-id': '*' });
    });

    it('removes the key when emptied', () => {
      const written = writeTriggerConnectorId('type: a.b\nconnector-id: x\n', '', 2);

      expect(parse(written)).toEqual({ type: 'a.b' });
    });

    it('leaves a fragment that does not parse as it is', () => {
      expect(writeTriggerConnectorId('type: [', 'x', 2)).toBe('type: [');
    });
  });

  describe('writeTriggerCondition', () => {
    it('sets on.condition and keeps what else is under on', () => {
      const written = writeTriggerCondition('type: a.b\non:\n  other: 1\n', 'body.x: 1', 2);

      expect(parse(written)).toEqual({ type: 'a.b', on: { other: 1, condition: 'body.x: 1' } });
    });

    it('writes a condition that has quotes and colons back to the same text', () => {
      const condition = 'body.action: "opened" and body.issue.title: *bug*';

      expect(parse(writeTriggerCondition('type: a.b\n', condition, 2)).on.condition).toBe(
        condition
      );
    });

    it('removes on when the emptied condition was all it held', () => {
      const written = writeTriggerCondition('type: a.b\non:\n  condition: x\n', '  ', 2);

      expect(parse(written)).toEqual({ type: 'a.b' });
    });

    it('does nothing to a trigger that has no condition when emptied', () => {
      expect(writeTriggerCondition('type: a.b\n', '', 2)).toBe('type: a.b\n');
    });
  });
});
