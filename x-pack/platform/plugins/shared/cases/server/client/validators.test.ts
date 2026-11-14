/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OBSERVABLE_TYPE_EMAIL, OBSERVABLE_TYPE_IPV4 } from '../../common/constants';
import { createCasesClientMock } from './mocks';
import {
  validateDuplicatedKeysInRequest,
  validateDuplicatedObservableTypesInRequest,
  validateDuplicatedObservablesInRequest,
  validateObservableTypeKeyExists,
  validateObservableTypeSettingsInRequest,
  validateObservableValue,
  pruneObservableTypeSettings,
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

  describe('validateObservableTypeSettingsInRequest', () => {
    const observableTypes = [{ key: 'custom_type' }];

    it('does not throw without settings', () => {
      expect(() => validateObservableTypeSettingsInRequest({ observableTypes })).not.toThrow();
    });

    it('does not throw for valid settings of built-in and custom types', () => {
      expect(() =>
        validateObservableTypeSettingsInRequest({
          observableTypes,
          observableTypeSettings: [
            { key: OBSERVABLE_TYPE_IPV4.key, paths: [{ path: 'source.ip' }] },
            { key: 'custom_type', paths: [{ path: 'custom.field' }], valuePattern: '^[a-z]+$' },
          ],
        })
      ).not.toThrow();
    });

    it('throws for a key that has more than one entry', () => {
      expect(() =>
        validateObservableTypeSettingsInRequest({
          observableTypes,
          observableTypeSettings: [{ key: 'custom_type' }, { key: 'custom_type' }],
        })
      ).toThrowErrorMatchingInlineSnapshot(
        `"Invalid observable type settings in request: observable type custom_type has more than one settings entry"`
      );
    });

    it('throws for a key that is not a built-in or a custom type', () => {
      expect(() =>
        validateObservableTypeSettingsInRequest({
          observableTypes,
          observableTypeSettings: [{ key: 'unknown_type' }],
        })
      ).toThrowErrorMatchingInlineSnapshot(
        `"Invalid observable type settings in request: observable type unknown_type does not exist"`
      );
    });

    it('throws for a value pattern on a built-in type', () => {
      expect(() =>
        validateObservableTypeSettingsInRequest({
          observableTypeSettings: [{ key: OBSERVABLE_TYPE_IPV4.key, valuePattern: '^a$' }],
        })
      ).toThrowErrorMatchingInlineSnapshot(
        `"Invalid observable type settings in request: built-in observable type observable-type-ipv4 cannot have a value pattern"`
      );
    });

    it('throws for a value pattern that does not compile', () => {
      expect(() =>
        validateObservableTypeSettingsInRequest({
          observableTypes,
          observableTypeSettings: [{ key: 'custom_type', valuePattern: '[' }],
        })
      ).toThrowErrorMatchingInlineSnapshot(
        `"Invalid observable type settings in request: observable type custom_type has an invalid value pattern"`
      );
    });

    it('throws for duplicated paths', () => {
      expect(() =>
        validateObservableTypeSettingsInRequest({
          observableTypes,
          observableTypeSettings: [
            { key: 'custom_type', paths: [{ path: 'custom.field' }, { path: 'custom.field' }] },
          ],
        })
      ).toThrowErrorMatchingInlineSnapshot(
        `"Invalid observable type settings in request: observable type custom_type has duplicated paths"`
      );
    });

    it('reports all errors', () => {
      expect(() =>
        validateObservableTypeSettingsInRequest({
          observableTypeSettings: [{ key: 'unknown_type' }, { key: 'unknown_type' }],
        })
      ).toThrowErrorMatchingInlineSnapshot(
        `"Invalid observable type settings in request: observable type unknown_type does not exist, observable type unknown_type has more than one settings entry, observable type unknown_type does not exist"`
      );
    });
  });

  describe('pruneObservableTypeSettings', () => {
    it('keeps the settings of built-in types and of the given custom types', () => {
      expect(
        pruneObservableTypeSettings({
          observableTypes: [{ key: 'kept_type' }],
          observableTypeSettings: [
            { key: OBSERVABLE_TYPE_IPV4.key },
            { key: 'kept_type' },
            { key: 'deleted_type' },
          ],
        })
      ).toEqual([{ key: OBSERVABLE_TYPE_IPV4.key }, { key: 'kept_type' }]);
    });
  });
});
