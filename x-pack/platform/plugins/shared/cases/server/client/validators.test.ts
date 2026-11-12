/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  OBSERVABLE_TYPE_EMAIL,
  OBSERVABLE_TYPE_IPV4,
  OBSERVABLE_TYPES_BUILTIN,
} from '../../common/constants';
import { createCasesClientMock } from './mocks';
import {
  validateDuplicatedKeysInRequest,
  validateDuplicatedObservableTypesInRequest,
  validateDuplicatedObservablesInRequest,
  validateObservableTypeKeyExists,
  validateObservableTypePathsInRequest,
  validateObservableValue,
} from './validators';

describe('validators', () => {
  describe('validateDuplicatedKeysInRequest', () => {
    it('returns fields in request that have duplicated keys', () => {
      expect(() =>
        validateDuplicatedKeysInRequest({
          requestFields: [
            {
              key: 'triplicated_key',
            },
            {
              key: 'triplicated_key',
            },
            {
              key: 'triplicated_key',
            },
            {
              key: 'duplicated_key',
            },
            {
              key: 'duplicated_key',
            },
          ],

          fieldName: 'foobar',
        })
      ).toThrowErrorMatchingInlineSnapshot(
        `"Invalid duplicated foobar keys in request: triplicated_key,duplicated_key"`
      );
    });

    it('does not throw if no fields in request have duplicated keys', () => {
      expect(() =>
        validateDuplicatedKeysInRequest({
          requestFields: [
            {
              key: '1',
            },
            {
              key: '2',
            },
          ],
          fieldName: 'foobar',
        })
      ).not.toThrow();
    });
  });

  describe('validateDuplicatedObservableTypesInRequest', () => {
    it('returns fields in request that have duplicated observable types (by labels)', () => {
      expect(() =>
        validateDuplicatedObservableTypesInRequest({
          requestFields: [
            {
              label: 'triplicated_label',
              key: '3aa53239-a608-4ccd-a69f-cb7d08d0b5cb',
            },
            {
              label: 'triplicated_label',
              key: 'a71629ae-05eb-48d5-a669-bb9f3eec81b6',
            },
            {
              label: 'triplicated_label',
              key: 'd5ff16a2-ead3-4f1d-b888-39376bfad8f2',
            },
            {
              label: 'duplicated_label',
              key: '9774be21-abc7-4aa4-9443-86636fea40bc',
            },
            {
              label: 'duplicated_label',
              key: 'fb638551-3b76-4bd9-8b45-7a86ddcb3b80',
            },
          ],
        })
      ).toThrowErrorMatchingInlineSnapshot(
        `"Invalid duplicated observable types in request: triplicated_label,duplicated_label"`
      );
    });

    it('returns fields in request that have duplicated observable types (by keys)', () => {
      expect(() =>
        validateDuplicatedObservableTypesInRequest({
          requestFields: [
            {
              label: 'a',
              key: 'triplicated_key',
            },
            {
              label: 'b',
              key: 'triplicated_key',
            },
            {
              label: 'c',
              key: 'triplicated_key',
            },
            {
              label: 'd',
              key: 'duplicated_key',
            },
            {
              label: 'e',
              key: 'duplicated_key',
            },
          ],
        })
      ).toThrowErrorMatchingInlineSnapshot(
        `"Invalid duplicated observable types in request: b,c,e"`
      );
    });

    it('does not throw if no fields in request have duplicated observable types', () => {
      expect(() =>
        validateDuplicatedObservableTypesInRequest({
          requestFields: [
            {
              label: '1',
              key: '1',
            },
            {
              label: '2',
              key: '2',
            },
          ],
        })
      ).not.toThrow();
    });

    it('does throw if the provided label duplicates builtin type', () => {
      expect(() =>
        validateDuplicatedObservableTypesInRequest({
          requestFields: [
            {
              label: 'email',
              key: 'email',
            },
          ],
        })
      ).toThrowErrorMatchingInlineSnapshot(
        `"Invalid duplicated observable types in request: email"`
      );
    });

    it('does not throw for an override entry of a built-in type without a label', () => {
      expect(() =>
        validateDuplicatedObservableTypesInRequest({
          requestFields: [{ key: 'observable-type-agent-id' }],
        })
      ).not.toThrow();
    });

    it('does not throw for an override entry that carries the label of a read', () => {
      const { key, label } = OBSERVABLE_TYPES_BUILTIN[0];

      expect(() =>
        validateDuplicatedObservableTypesInRequest({ requestFields: [{ key, label }] })
      ).not.toThrow();
    });

    it('throws for a built-in key with a label other than the built-in label', () => {
      const { key } = OBSERVABLE_TYPES_BUILTIN[0];

      expect(() =>
        validateDuplicatedObservableTypesInRequest({ requestFields: [{ key, label: 'Renamed' }] })
      ).toThrow('Invalid duplicated observable types in request: renamed');
    });
  });

  describe('validateObservableTypePathsInRequest', () => {
    it('does not throw for valid custom types and built-in overrides', () => {
      expect(() =>
        validateObservableTypePathsInRequest({
          requestFields: [
            { key: 'observable-type-agent-id', paths: [{ path: 'agent.id' }] },
            { key: 'observable-type-ipv4', paths: [{ path: 'zscaler.client_ip' }] },
            {
              key: 'employee-id',
              label: 'Employee ID',
              paths: [{ path: 'user.employee_id' }],
              valuePattern: '^E\\d{6}$',
            },
            { key: 'ticket-ref', label: 'Ticket ref' },
          ],
        })
      ).not.toThrow();
    });

    it('throws for a custom type without a label', () => {
      expect(() =>
        validateObservableTypePathsInRequest({ requestFields: [{ key: 'employee-id' }] })
      ).toThrowErrorMatchingInlineSnapshot(
        `"Invalid observable types in request: custom observable type employee-id needs a label"`
      );
    });

    it('throws for two override entries of one built-in type', () => {
      expect(() =>
        validateObservableTypePathsInRequest({
          requestFields: [{ key: 'observable-type-agent-id' }, { key: 'observable-type-agent-id' }],
        })
      ).toThrowErrorMatchingInlineSnapshot(
        `"Invalid observable types in request: built-in observable type observable-type-agent-id has more than one entry"`
      );
    });

    it('throws for two override entries when one carries the label of a read', () => {
      const { key, label } = OBSERVABLE_TYPES_BUILTIN[0];

      expect(() =>
        validateObservableTypePathsInRequest({ requestFields: [{ key }, { key, label }] })
      ).toThrow(`built-in observable type ${key} has more than one entry`);
    });

    it('does not count overrides that carry the label of a read as custom types', () => {
      const overrides = OBSERVABLE_TYPES_BUILTIN.map(({ key, label }) => ({ key, label }));
      const customTypes = Array.from({ length: 10 }, (_, index) => ({
        key: `custom-${index}`,
        label: `Custom ${index}`,
      }));

      expect(() =>
        validateObservableTypePathsInRequest({ requestFields: [...overrides, ...customTypes] })
      ).not.toThrow();
    });

    it('throws for a value pattern on a built-in type', () => {
      expect(() =>
        validateObservableTypePathsInRequest({
          requestFields: [{ key: 'observable-type-ipv4', valuePattern: '.*' }],
        })
      ).toThrowErrorMatchingInlineSnapshot(
        `"Invalid observable types in request: built-in observable type observable-type-ipv4 cannot have a value pattern"`
      );
    });

    it('throws for a value pattern that does not compile', () => {
      expect(() =>
        validateObservableTypePathsInRequest({
          requestFields: [{ key: 'employee-id', label: 'Employee ID', valuePattern: '(' }],
        })
      ).toThrowErrorMatchingInlineSnapshot(
        `"Invalid observable types in request: observable type employee-id has an invalid value pattern"`
      );
    });

    it('throws for duplicated paths in one entry', () => {
      expect(() =>
        validateObservableTypePathsInRequest({
          requestFields: [
            {
              key: 'observable-type-hostname',
              paths: [{ path: 'host.name' }, { path: 'host.name' }],
            },
          ],
        })
      ).toThrowErrorMatchingInlineSnapshot(
        `"Invalid observable types in request: observable type observable-type-hostname has duplicated paths"`
      );
    });

    it('counts only custom types against the custom type limit', () => {
      const overrides = OBSERVABLE_TYPES_BUILTIN.map(({ key }) => ({ key }));
      const customTypes = Array.from({ length: 10 }, (_, index) => ({
        key: `custom-${index}`,
        label: `Custom ${index}`,
      }));

      expect(() =>
        validateObservableTypePathsInRequest({ requestFields: [...overrides, ...customTypes] })
      ).not.toThrow();

      expect(() =>
        validateObservableTypePathsInRequest({
          requestFields: [...customTypes, { key: 'custom-10', label: 'Custom 10' }],
        })
      ).toThrowErrorMatchingInlineSnapshot(
        `"Invalid observable types in request: the maximum of custom observable types is 10"`
      );
    });
  });

  describe('validateDuplicatedObservablesInRequest', () => {
    it('returns observables in request that have duplicated labels', () => {
      expect(() =>
        validateDuplicatedObservablesInRequest({
          requestFields: [
            {
              value: 'value',
              typeKey: 'typeKey',
            },
            {
              value: 'value',
              typeKey: 'typeKey',
            },
          ],
        })
      ).toThrowErrorMatchingInlineSnapshot(`"Invalid duplicated observables in request."`);
    });

    it('does not throw if no fields in request have duplicated observables', () => {
      expect(() =>
        validateDuplicatedObservablesInRequest({
          requestFields: [
            {
              value: 'value',
              typeKey: 'typeKey',
            },
            {
              value: 'value 1',
              typeKey: 'typeKey',
            },
            {
              value: 'value',
              typeKey: 'typeKey 2',
            },
          ],
        })
      ).not.toThrow();
    });
  });

  describe('validateObservableTypeKeyExists', () => {
    const mockCasesClient = createCasesClientMock();

    it('does not throw if all observable type keys exist', async () => {
      await expect(
        validateObservableTypeKeyExists(mockCasesClient, {
          caseOwner: 'securityFixture',
          observableTypeKey: OBSERVABLE_TYPE_IPV4.key,
        })
      ).resolves.not.toThrow();
    });

    it('throws an error if any observable type key does not exist', async () => {
      await expect(() =>
        validateObservableTypeKeyExists(mockCasesClient, {
          caseOwner: 'securityFixture',
          observableTypeKey: 'random key',
        })
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Invalid observable type, key does not exist: random key"`
      );
    });
  });

  describe('validateObservableValue', () => {
    it('throws an error if any observable value is not valid', async () => {
      expect(() =>
        validateObservableValue(OBSERVABLE_TYPE_EMAIL.key, 'test')
      ).toThrowErrorMatchingInlineSnapshot(
        `"Observable value \\"test\\" is not valid for selected observable type observable-type-email."`
      );
    });

    it('does not throw when obserable value is valid', async () => {
      expect(() =>
        validateObservableValue(OBSERVABLE_TYPE_EMAIL.key, 'test@test.com')
      ).not.toThrow();
    });
  });
});
