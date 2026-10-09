/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CustomFieldTypes } from '../../../common/types/domain';
import {
  areFieldRepresentationsEqual,
  decodeStorageFieldValue,
  encodeLegacyFieldValue,
} from './field_value_codecs';

describe('field_value_codecs', () => {
  describe('encodeLegacyFieldValue', () => {
    it('encodes a text value as the string itself', () => {
      expect(encodeLegacyFieldValue(CustomFieldTypes.TEXT, 'hello')).toEqual({
        ok: true,
        value: 'hello',
      });
    });

    it('rejects a non-string value for a text field', () => {
      expect(encodeLegacyFieldValue(CustomFieldTypes.TEXT, 42)).toMatchObject({ ok: false });
      expect(encodeLegacyFieldValue(CustomFieldTypes.TEXT, true)).toMatchObject({ ok: false });
    });

    it('encodes an integer as its canonical base-10 string', () => {
      expect(encodeLegacyFieldValue(CustomFieldTypes.NUMBER, 42)).toEqual({
        ok: true,
        value: '42',
      });
      expect(encodeLegacyFieldValue(CustomFieldTypes.NUMBER, -7)).toEqual({
        ok: true,
        value: '-7',
      });
      expect(encodeLegacyFieldValue(CustomFieldTypes.NUMBER, 0)).toEqual({ ok: true, value: '0' });
    });

    it('rejects non-integers and unsafe integers for a number field', () => {
      expect(encodeLegacyFieldValue(CustomFieldTypes.NUMBER, 1.5)).toMatchObject({ ok: false });
      expect(
        encodeLegacyFieldValue(CustomFieldTypes.NUMBER, Number.MAX_SAFE_INTEGER + 1)
      ).toMatchObject({ ok: false });
      expect(encodeLegacyFieldValue(CustomFieldTypes.NUMBER, '42')).toMatchObject({ ok: false });
    });

    it('encodes booleans as the literal strings true/false', () => {
      expect(encodeLegacyFieldValue(CustomFieldTypes.TOGGLE, true)).toEqual({
        ok: true,
        value: 'true',
      });
      expect(encodeLegacyFieldValue(CustomFieldTypes.TOGGLE, false)).toEqual({
        ok: true,
        value: 'false',
      });
    });

    it('rejects truthy non-boolean values for a toggle field (no generic truthiness)', () => {
      expect(encodeLegacyFieldValue(CustomFieldTypes.TOGGLE, 1)).toMatchObject({ ok: false });
      expect(encodeLegacyFieldValue(CustomFieldTypes.TOGGLE, 'true')).toMatchObject({ ok: false });
    });

    it('rejects an unsupported field type', () => {
      expect(encodeLegacyFieldValue('list', 'x')).toMatchObject({ ok: false });
    });
  });

  describe('decodeStorageFieldValue', () => {
    it('decodes a text storage value as the string itself', () => {
      expect(decodeStorageFieldValue(CustomFieldTypes.TEXT, 'hello')).toEqual({
        ok: true,
        value: 'hello',
      });
    });

    it('decodes a canonical integer string', () => {
      expect(decodeStorageFieldValue(CustomFieldTypes.NUMBER, '42')).toEqual({
        ok: true,
        value: 42,
      });
      expect(decodeStorageFieldValue(CustomFieldTypes.NUMBER, '-7')).toEqual({
        ok: true,
        value: -7,
      });
      expect(decodeStorageFieldValue(CustomFieldTypes.NUMBER, '0')).toEqual({ ok: true, value: 0 });
    });

    it('rejects non-canonical numeric strings (no permissive parsing)', () => {
      for (const value of ['007', '1.5', '1e3', ' 42', '42 ', '-0', '', '0x1f']) {
        expect(decodeStorageFieldValue(CustomFieldTypes.NUMBER, value)).toMatchObject({
          ok: false,
        });
      }
    });

    it('rejects integers outside the safe range', () => {
      expect(decodeStorageFieldValue(CustomFieldTypes.NUMBER, '9007199254740993')).toMatchObject({
        ok: false,
      });
    });

    it('decodes strict boolean strings only', () => {
      expect(decodeStorageFieldValue(CustomFieldTypes.TOGGLE, 'true')).toEqual({
        ok: true,
        value: true,
      });
      expect(decodeStorageFieldValue(CustomFieldTypes.TOGGLE, 'false')).toEqual({
        ok: true,
        value: false,
      });
      for (const value of ['True', 'TRUE', '1', '0', 'yes', '']) {
        expect(decodeStorageFieldValue(CustomFieldTypes.TOGGLE, value)).toMatchObject({
          ok: false,
        });
      }
    });

    it('rejects an unsupported field type', () => {
      expect(decodeStorageFieldValue('list', 'x')).toMatchObject({ ok: false });
    });

    it('round-trips every supported encoding', () => {
      const cases: Array<[string, string | number | boolean]> = [
        [CustomFieldTypes.TEXT, 'some text'],
        [CustomFieldTypes.NUMBER, 12345],
        [CustomFieldTypes.NUMBER, -1],
        [CustomFieldTypes.TOGGLE, true],
        [CustomFieldTypes.TOGGLE, false],
      ];
      for (const [type, value] of cases) {
        const encoded = encodeLegacyFieldValue(type, value);
        expect(encoded.ok).toBe(true);
        if (encoded.ok) {
          expect(decodeStorageFieldValue(type, encoded.value)).toEqual({ ok: true, value });
        }
      }
    });
  });

  describe('areFieldRepresentationsEqual', () => {
    it('treats v1 null/undefined and absent v2 key as equal', () => {
      expect(areFieldRepresentationsEqual(CustomFieldTypes.TEXT, null, undefined)).toBe(true);
      expect(areFieldRepresentationsEqual(CustomFieldTypes.TEXT, undefined, undefined)).toBe(true);
    });

    it('treats the explicit v2 clear marker as the empty value', () => {
      expect(areFieldRepresentationsEqual(CustomFieldTypes.TEXT, null, '')).toBe(true);
      expect(areFieldRepresentationsEqual(CustomFieldTypes.TEXT, 'x', '')).toBe(false);
    });

    it('treats one-sided emptiness as inequality', () => {
      expect(areFieldRepresentationsEqual(CustomFieldTypes.TEXT, null, 'x')).toBe(false);
      expect(areFieldRepresentationsEqual(CustomFieldTypes.NUMBER, 42, undefined)).toBe(false);
    });

    it('compares non-empty pairs through the canonical encoding', () => {
      expect(areFieldRepresentationsEqual(CustomFieldTypes.NUMBER, 42, '42')).toBe(true);
      expect(areFieldRepresentationsEqual(CustomFieldTypes.NUMBER, 42, '042')).toBe(false);
      expect(areFieldRepresentationsEqual(CustomFieldTypes.TOGGLE, true, 'true')).toBe(true);
      expect(areFieldRepresentationsEqual(CustomFieldTypes.TOGGLE, true, '1')).toBe(false);
      expect(areFieldRepresentationsEqual(CustomFieldTypes.TEXT, 'a', 'a')).toBe(true);
      expect(areFieldRepresentationsEqual(CustomFieldTypes.TEXT, 'a', 'b')).toBe(false);
    });
  });
});
