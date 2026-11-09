/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit } from 'lodash';
import { ConnectorTypes, SECURITY_SOLUTION_OWNER } from '../../../common';
import { getPartialCaseTransformedAttributesSchema, OwnerSchema } from './case';
import { decodeOrThrowZod } from '../runtime_types';
import { CaseSeverity, CaseStatuses } from '../../../common/types/domain';

describe('case types', () => {
  describe('getPartialCaseTransformedAttributesSchema', () => {
    const theCaseAttributes = {
      closed_at: null,
      closed_by: null,
      connector: {
        id: 'none',
        name: 'none',
        type: ConnectorTypes.none,
        fields: null,
      },
      created_at: '2019-11-25T21:54:48.952Z',
      created_by: {
        full_name: 'elastic',
        email: 'testemail@elastic.co',
        username: 'elastic',
      },
      severity: CaseSeverity.LOW,
      duration: null,
      description: 'This is a brand new case of a bad meanie defacing data',
      external_service: null,
      title: 'Super Bad Security Issue',
      status: CaseStatuses.open,
      tags: ['defacement'],
      updated_at: '2019-11-25T21:54:48.952Z',
      updated_by: {
        full_name: 'elastic',
        email: 'testemail@elastic.co',
        username: 'elastic',
      },
      settings: {
        syncAlerts: true,
        extractObservables: true,
      },
      owner: SECURITY_SOLUTION_OWNER,
      assignees: [],
      observables: [],
    };

    const schema = getPartialCaseTransformedAttributesSchema();

    it.each(Object.keys(theCaseAttributes))('does not throw if %s is omitted', (key) => {
      const theCase = omit(theCaseAttributes, key);
      const decoded = schema.parse(theCase);

      expect(decoded).toEqual(theCase);
    });

    it('strips excess properties', () => {
      const decoded = schema.parse({ description: 'test', 'not-exists': 'excess' });

      expect(decoded).toEqual({ description: 'test' });
    });

    it('keeps the attachment stats', () => {
      const decoded = schema.parse({
        description: 'test',
        total_alerts: 0,
        total_comments: 0,
      });

      expect(decoded).toEqual({ description: 'test', total_alerts: 0, total_comments: 0 });
    });
  });

  describe('OwnerSchema', () => {
    it('strips excess fields from the result', () => {
      const res = decodeOrThrowZod(OwnerSchema)({
        owner: 'yes',
        created_at: '123',
      });

      expect(res).toStrictEqual({ owner: 'yes' });
    });

    it('throws an error when owner is not present', () => {
      expect(() => decodeOrThrowZod(OwnerSchema)({})).toThrowErrorMatchingInlineSnapshot(
        `"owner: Invalid input: expected string, received undefined"`
      );
    });
  });
});
