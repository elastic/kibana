/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { toStackConnectorType } from './to_stack_connector_type';

describe('toStackConnectorType', () => {
  describe('common connector types', () => {
    const commonTypes = [
      'notion',
      'github',
      'slack',
      'jira',
      'confluence',
      'salesforce',
      'dropbox',
      'googledrive',
      'onedrive',
      'sharepoint',
    ];

    commonTypes.forEach((type) => {
      it(`should convert ${type} to .${type}`, () => {
        expect(toStackConnectorType(type)).toBe(`.${type}`);
      });
    });
  });

  describe('error cases', () => {
    it('should throw error for empty string', () => {
      expect(() => toStackConnectorType('')).toThrow('Connector type cannot be empty');
    });

    it('should throw error for whitespace-only string', () => {
      expect(() => toStackConnectorType('   ')).toThrow('Connector type cannot be empty');
    });
  });

  it('should NOT add another dot if type already has dot prefix', () => {
    expect(toStackConnectorType('.notion')).toBe('.notion');
  });

  it('should handle types that already have multiple connectors prefixed', () => {
    expect(toStackConnectorType('.github')).toBe('.github');
    expect(toStackConnectorType('.slack')).toBe('.slack');
  });
});
