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

describe('dotted attribute keys', () => {
  const dottedKeysError = (type: string, keys: string) =>
    new Error(
      `Invalid EncryptedSavedObjectTypeRegistration for type '${type}'. Attribute keys are matched ` +
        `as flat top-level attribute names, not as nested paths, so these keys would not encrypt ` +
        `the nested values they appear to name: ${keys}`
    );

  it('throws when attributesToEncrypt contains a dotted key', () => {
    expect(() => {
      new EncryptedSavedObjectAttributesDefinition({
        type: 'some-type',
        attributesToEncrypt: new Set(['attr#1', 'ssl.key']),
      });
    }).toThrow(dottedKeysError('some-type', 'ssl.key'));
  });

  it('throws when attributesToIncludeInAAD contains a dotted key', () => {
    expect(() => {
      new EncryptedSavedObjectAttributesDefinition({
        type: 'some-type',
        attributesToEncrypt: new Set(['attr#1']),
        attributesToIncludeInAAD: new Set(['ssl.certificate']),
      });
    }).toThrow(dottedKeysError('some-type', 'ssl.certificate'));
  });

  it('reports every offending key at once, across both sets', () => {
    expect(() => {
      new EncryptedSavedObjectAttributesDefinition({
        type: 'some-type',
        attributesToEncrypt: new Set(['ssl.key', { key: 'source.inline.script' }]),
        attributesToIncludeInAAD: new Set(['url.port']),
      });
    }).toThrow(dottedKeysError('some-type', 'ssl.key, source.inline.script, url.port'));
  });

  it('does not throw for flat keys', () => {
    expect(() => {
      new EncryptedSavedObjectAttributesDefinition({
        type: 'some-type',
        attributesToEncrypt: new Set(['secrets', { key: 'apiKey' }]),
        attributesToIncludeInAAD: new Set(['name', 'enabled']),
      });
    }).not.toThrow();
  });

  it('permits the grandfathered synthetics monitor keys', () => {
    expect(() => {
      new EncryptedSavedObjectAttributesDefinition({
        type: 'synthetics-monitor',
        attributesToEncrypt: new Set(['secrets', 'ssl.key', 'source.inline.script']),
        attributesToIncludeInAAD: new Set([
          'service.name',
          'throttling.config',
          'source.zip_url.ssl.certificate',
        ]),
      });
    }).not.toThrow();
  });

  it('still rejects an unrelated dotted key on a grandfathered type', () => {
    expect(() => {
      new EncryptedSavedObjectAttributesDefinition({
        type: 'synthetics-monitor',
        attributesToEncrypt: new Set(['ssl.key', 'attributes.nested.thing']),
      });
    }).toThrow(dottedKeysError('synthetics-monitor', 'attributes.nested.thing'));
  });

  it('rejects a new key sharing a prefix with a grandfathered one', () => {
    expect(() => {
      new EncryptedSavedObjectAttributesDefinition({
        type: 'synthetics-monitor',
        attributesToEncrypt: new Set(['ssl.key', 'ssl.brand_new_secret']),
      });
    }).toThrow(dottedKeysError('synthetics-monitor', 'ssl.brand_new_secret'));
  });

  it('does not extend the legacy type allowance to the multi-space type', () => {
    expect(() => {
      new EncryptedSavedObjectAttributesDefinition({
        type: 'synthetics-monitor-multi-space',
        attributesToEncrypt: new Set(['ssl.key']),
        attributesToIncludeInAAD: new Set(['throttling.config']),
      });
    }).toThrow(dottedKeysError('synthetics-monitor-multi-space', 'throttling.config'));
  });

  it('does not extend a grandfathered allowance to another type', () => {
    expect(() => {
      new EncryptedSavedObjectAttributesDefinition({
        type: 'some-other-type',
        attributesToEncrypt: new Set(['ssl.key']),
      });
    }).toThrow(dottedKeysError('some-other-type', 'ssl.key'));
  });
});
