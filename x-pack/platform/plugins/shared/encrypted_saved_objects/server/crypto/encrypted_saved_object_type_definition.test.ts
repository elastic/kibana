/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EncryptedSavedObjectAttributesDefinition } from './encrypted_saved_object_type_definition';
import type { EncryptedSavedObjectTypeRegistration } from './encrypted_saved_objects_service';

it('correctly determines attribute properties', () => {
  const attributes = ['attr#1', 'attr#2', 'attr#3', 'attr#4'];
  const cases: Array<
    [
      EncryptedSavedObjectTypeRegistration,
      {
        shouldBeEncrypted: boolean[];
        shouldBeIncludedInAAD: boolean[];
        shouldBeStripped: boolean[];
      }
    ]
  > = [
    [
      {
        type: 'so-type',
        attributesToEncrypt: new Set(['attr#1', 'attr#2', 'attr#3', 'attr#4']),
      },
      {
        shouldBeEncrypted: [true, true, true, true],
        shouldBeIncludedInAAD: [false, false, false, false],
        shouldBeStripped: [true, true, true, true],
      },
    ],
    [
      {
        type: 'so-type',
        attributesToEncrypt: new Set(['attr#1', 'attr#2']),
      },
      {
        shouldBeEncrypted: [true, true, false, false],
        shouldBeIncludedInAAD: [false, false, false, false],
        shouldBeStripped: [true, true, false, false],
      },
    ],
    [
      {
        type: 'so-type',
        attributesToEncrypt: new Set([{ key: 'attr#1' }, { key: 'attr#2' }]),
      },
      {
        shouldBeEncrypted: [true, true, false, false],
        shouldBeIncludedInAAD: [false, false, false, false],
        shouldBeStripped: [true, true, false, false],
      },
    ],
    [
      {
        type: 'so-type',
        attributesToEncrypt: new Set(['attr#1', 'attr#2']),
        attributesToIncludeInAAD: new Set(['attr#4']),
      },
      {
        shouldBeEncrypted: [true, true, false, false],
        shouldBeIncludedInAAD: [false, false, false, true],
        shouldBeStripped: [true, true, false, false],
      },
    ],
    [
      {
        type: 'so-type',
        attributesToEncrypt: new Set([
          'attr#1',
          'attr#2',
          { key: 'attr#4', dangerouslyExposeValue: true },
        ]),
        attributesToIncludeInAAD: new Set(['attr#3']),
      },
      {
        shouldBeEncrypted: [true, true, false, true],
        shouldBeIncludedInAAD: [false, false, true, false], // will not include attr#4 because it is to be encrypted
        shouldBeStripped: [true, true, false, false],
      },
    ],
    [
      {
        type: 'so-type',
        attributesToEncrypt: new Set([
          { key: 'attr#1', dangerouslyExposeValue: true },
          'attr#2',
          { key: 'attr#4', dangerouslyExposeValue: true },
        ]),
        attributesToIncludeInAAD: new Set(['attr#3', 'some-other-attribute']),
      },
      {
        shouldBeEncrypted: [true, true, false, true],
        shouldBeIncludedInAAD: [false, false, true, false],
        shouldBeStripped: [false, true, false, false],
      },
    ],
  ];

  for (const [typeRegistration, asserts] of cases) {
    const typeDefinition = new EncryptedSavedObjectAttributesDefinition(typeRegistration);
    for (const [attributeIndex, attributeName] of attributes.entries()) {
      expect(typeDefinition.shouldBeEncrypted(attributeName)).toBe(
        asserts.shouldBeEncrypted[attributeIndex]
      );
      expect(typeDefinition.shouldBeStripped(attributeName)).toBe(
        asserts.shouldBeStripped[attributeIndex]
      );
      expect(typeDefinition.shouldBeIncludedInAAD(attributeName)).toBe(
        asserts.shouldBeIncludedInAAD[attributeIndex]
      );
    }
  }
});

it('throws when the same attributes are included in AAD and encrypted', () => {
  const registration = {
    type: 'some-type',
    attributesToEncrypt: new Set(['attr#1', 'attr#3', 'attr#5', 'attr#7']),
    attributesToIncludeInAAD: new Set(['attr#1', 'attr#2', 'attr#4', 'attr#7']),
  };

  expect(() => {
    new EncryptedSavedObjectAttributesDefinition(registration);
  }).toThrow(
    new Error(
      `Invalid EncryptedSavedObjectTypeRegistration for type 'some-type'. attributesToIncludeInAAD must not contain any values in attributesToEncrypt: attr#1,attr#7`
    )
  );
});
