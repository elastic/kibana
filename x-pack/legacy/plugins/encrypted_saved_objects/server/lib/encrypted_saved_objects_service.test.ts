/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

jest.mock('@elastic/node-crypto', () => jest.fn());

import { EncryptedSavedObjectsAuditLogger } from './encrypted_saved_objects_audit_logger';
import { EncryptedSavedObjectsService } from './encrypted_saved_objects_service';
import { EncryptionError } from './encryption_error';

let service: EncryptedSavedObjectsService;
let mockAuditLogger: jest.Mocked<EncryptedSavedObjectsAuditLogger>;
beforeEach(() => {
  mockAuditLogger = {
    encryptAttributesSuccess: jest.fn(),
    encryptAttributeFailure: jest.fn(),
    decryptAttributesSuccess: jest.fn(),
    decryptAttributeFailure: jest.fn(),
  } as any;

  // Call actual `@elastic/node-crypto` by default, but allow to override implementation in tests.
  jest
    .requireMock('@elastic/node-crypto')
    .mockImplementation((...args: any[]) => jest.requireActual('@elastic/node-crypto')(...args));

  service = new EncryptedSavedObjectsService(
    'encryption-key-abc',
    ['known-type-1', 'known-type-2'],
    { debug: jest.fn(), error: jest.fn() } as any,
    mockAuditLogger
  );
});

afterEach(() => jest.resetAllMocks());

it('correctly initializes crypto', () => {
  const mockNodeCrypto = jest.requireMock('@elastic/node-crypto');
  expect(mockNodeCrypto).toHaveBeenCalledTimes(1);
  expect(mockNodeCrypto).toHaveBeenCalledWith({ encryptionKey: 'encryption-key-abc' });
});

describe('#registerType', () => {
  it('throws if `attributesToEncrypt` is empty', () => {
    expect(() =>
      service.registerType({ type: 'known-type-1', attributesToEncrypt: new Set() })
    ).toThrowError('The "attributesToEncrypt" array for "known-type-1" is empty.');
  });

  it('throws if `type` has been registered already', () => {
    service.registerType({ type: 'known-type-1', attributesToEncrypt: new Set(['attr']) });
    expect(() =>
      service.registerType({ type: 'known-type-1', attributesToEncrypt: new Set(['attr']) })
    ).toThrowError('The "known-type-1" saved object type is already registered.');
  });

  it('throws if `type` references to the unknown type', () => {
    expect(() =>
      service.registerType({ type: 'unknown-type', attributesToEncrypt: new Set(['attr']) })
    ).toThrowError('The type "unknown-type" is not known saved object type.');
  });
});

describe('#isRegistered', () => {
  it('correctly determines whether the specified type is registered', () => {
    expect(service.isRegistered('known-type-1')).toBe(false);
    expect(service.isRegistered('known-type-2')).toBe(false);
    expect(service.isRegistered('unknown-type')).toBe(false);

    service.registerType({ type: 'known-type-1', attributesToEncrypt: new Set(['attr-1']) });
    expect(service.isRegistered('known-type-1')).toBe(true);
    expect(service.isRegistered('known-type-2')).toBe(false);
    expect(service.isRegistered('unknown-type')).toBe(false);

    service.registerType({ type: 'known-type-2', attributesToEncrypt: new Set(['attr-2']) });
    expect(service.isRegistered('known-type-1')).toBe(true);
    expect(service.isRegistered('known-type-2')).toBe(true);
    expect(service.isRegistered('unknown-type')).toBe(false);
  });
});

describe('#stripEncryptedAttributes', () => {
  it('does not strip attributes from unknown types', () => {
    const attributes = { attrOne: 'one', attrTwo: 'two', attrThree: 'three' };

    expect(service.stripEncryptedAttributes('unknown-type', attributes)).toEqual({
      attrOne: 'one',
      attrTwo: 'two',
      attrThree: 'three',
    });
  });

  it('does not strip attributes from known, but not registered types', () => {
    const attributes = { attrOne: 'one', attrTwo: 'two', attrThree: 'three' };

    expect(service.stripEncryptedAttributes('known-type-1', attributes)).toEqual({
      attrOne: 'one',
      attrTwo: 'two',
      attrThree: 'three',
    });
  });

  it('does not strip any attributes if none of them are supposed to be encrypted', () => {
    const attributes = { attrOne: 'one', attrTwo: 'two', attrThree: 'three' };

    service.registerType({ type: 'known-type-1', attributesToEncrypt: new Set(['attrFour']) });

    expect(service.stripEncryptedAttributes('known-type-1', attributes)).toEqual({
      attrOne: 'one',
      attrTwo: 'two',
      attrThree: 'three',
    });
  });

  it('strips only attributes that are supposed to be encrypted', () => {
    const attributes = { attrOne: 'one', attrTwo: 'two', attrThree: 'three' };

    service.registerType({
      type: 'known-type-1',
      attributesToEncrypt: new Set(['attrOne', 'attrThree']),
    });

    expect(service.stripEncryptedAttributes('known-type-1', attributes)).toEqual({
      attrTwo: 'two',
    });
  });
});

describe('#encryptAttributes', () => {
  let mockEncrypt: jest.Mock;
  beforeEach(() => {
    mockEncrypt = jest
      .fn()
      .mockImplementation(async (valueToEncrypt, aad) => `|${valueToEncrypt}|${aad}|`);
    jest.requireMock('@elastic/node-crypto').mockReturnValue({ encrypt: mockEncrypt });

    service = new EncryptedSavedObjectsService(
      'encryption-key-abc',
      ['known-type-1', 'known-type-2'],
      { debug: jest.fn(), error: jest.fn() } as any,
      mockAuditLogger
    );
  });

  it('does not encrypt attributes for unknown types', async () => {
    const attributes = { attrOne: 'one', attrTwo: 'two', attrThree: 'three' };

    await expect(
      service.encryptAttributes({ type: 'unknown-type', id: 'object-id' }, attributes)
    ).resolves.toEqual({
      attrOne: 'one',
      attrTwo: 'two',
      attrThree: 'three',
    });
    expect(mockAuditLogger.encryptAttributesSuccess).not.toHaveBeenCalled();
  });

  it('does not encrypt attributes for known, but not registered types', async () => {
    const attributes = { attrOne: 'one', attrTwo: 'two', attrThree: 'three' };

    await expect(
      service.encryptAttributes({ type: 'known-type-1', id: 'object-id' }, attributes)
    ).resolves.toEqual({
      attrOne: 'one',
      attrTwo: 'two',
      attrThree: 'three',
    });
    expect(mockAuditLogger.encryptAttributesSuccess).not.toHaveBeenCalled();
  });

  it('does not encrypt attributes that are not supposed to be encrypted', async () => {
    const attributes = { attrOne: 'one', attrTwo: 'two', attrThree: 'three' };

    service.registerType({ type: 'known-type-1', attributesToEncrypt: new Set(['attrFour']) });

    await expect(
      service.encryptAttributes({ type: 'known-type-1', id: 'object-id' }, attributes)
    ).resolves.toEqual({
      attrOne: 'one',
      attrTwo: 'two',
      attrThree: 'three',
    });
    expect(mockAuditLogger.encryptAttributesSuccess).not.toHaveBeenCalled();
  });

  it('encrypts only attributes that are supposed to be encrypted', async () => {
    const attributes = { attrOne: 'one', attrTwo: 'two', attrThree: 'three', attrFour: null };

    service.registerType({
      type: 'known-type-1',
      attributesToEncrypt: new Set(['attrOne', 'attrThree', 'attrFour']),
    });

    await expect(
      service.encryptAttributes({ type: 'known-type-1', id: 'object-id' }, attributes)
    ).resolves.toEqual({
      attrOne: '|one|["known-type-1","object-id",{"attrTwo":"two"}]|',
      attrTwo: 'two',
      attrThree: '|three|["known-type-1","object-id",{"attrTwo":"two"}]|',
      attrFour: null,
    });
    expect(mockAuditLogger.encryptAttributesSuccess).toHaveBeenCalledTimes(1);
    expect(mockAuditLogger.encryptAttributesSuccess).toHaveBeenCalledWith(
      ['attrOne', 'attrThree'],
      { type: 'known-type-1', id: 'object-id' }
    );
  });

  it('encrypts only attributes that are supposed to be encrypted even if not all provided', async () => {
    const attributes = { attrTwo: 'two', attrThree: 'three' };

    service.registerType({
      type: 'known-type-1',
      attributesToEncrypt: new Set(['attrOne', 'attrThree']),
    });

    await expect(
      service.encryptAttributes({ type: 'known-type-1', id: 'object-id' }, attributes)
    ).resolves.toEqual({
      attrTwo: 'two',
      attrThree: '|three|["known-type-1","object-id",{"attrTwo":"two"}]|',
    });
    expect(mockAuditLogger.encryptAttributesSuccess).toHaveBeenCalledTimes(1);
    expect(mockAuditLogger.encryptAttributesSuccess).toHaveBeenCalledWith(['attrThree'], {
      type: 'known-type-1',
      id: 'object-id',
    });
  });

  it('includes `namespace` into AAD if provided', async () => {
    const attributes = { attrTwo: 'two', attrThree: 'three' };

    service.registerType({
      type: 'known-type-1',
      attributesToEncrypt: new Set(['attrOne', 'attrThree']),
    });

    await expect(
      service.encryptAttributes(
        { type: 'known-type-1', id: 'object-id', namespace: 'object-ns' },
        attributes
      )
    ).resolves.toEqual({
      attrTwo: 'two',
      attrThree: '|three|["object-ns","known-type-1","object-id",{"attrTwo":"two"}]|',
    });
    expect(mockAuditLogger.encryptAttributesSuccess).toHaveBeenCalledTimes(1);
    expect(mockAuditLogger.encryptAttributesSuccess).toHaveBeenCalledWith(['attrThree'], {
      type: 'known-type-1',
      id: 'object-id',
      namespace: 'object-ns',
    });
  });

  it('does not include specified attributes to AAD', async () => {
    const knownType1attributes = { attrOne: 'one', attrTwo: 'two', attrThree: 'three' };
    service.registerType({
      type: 'known-type-1',
      attributesToEncrypt: new Set(['attrThree']),
    });

    const knownType2attributes = { attrOne: 'one', attrTwo: 'two', attrThree: 'three' };
    service.registerType({
      type: 'known-type-2',
      attributesToEncrypt: new Set(['attrThree']),
      attributesToExcludeFromAAD: new Set(['attrTwo']),
    });

    await expect(
      service.encryptAttributes({ type: 'known-type-1', id: 'object-id-1' }, knownType1attributes)
    ).resolves.toEqual({
      attrOne: 'one',
      attrTwo: 'two',
      attrThree: '|three|["known-type-1","object-id-1",{"attrOne":"one","attrTwo":"two"}]|',
    });
    await expect(
      service.encryptAttributes({ type: 'known-type-2', id: 'object-id-2' }, knownType2attributes)
    ).resolves.toEqual({
      attrOne: 'one',
      attrTwo: 'two',
      attrThree: '|three|["known-type-2","object-id-2",{"attrOne":"one"}]|',
    });
  });

  it('encrypts even if no attributes are included into AAD', async () => {
    const attributes = { attrOne: 'one', attrThree: 'three' };
    service.registerType({
      type: 'known-type-1',
      attributesToEncrypt: new Set(['attrOne', 'attrThree']),
    });

    await expect(
      service.encryptAttributes({ type: 'known-type-1', id: 'object-id-1' }, attributes)
    ).resolves.toEqual({
      attrOne: '|one|["known-type-1","object-id-1",{}]|',
      attrThree: '|three|["known-type-1","object-id-1",{}]|',
    });
  });

  it('fails if encryption of any attribute fails', async () => {
    const attributes = { attrOne: 'one', attrTwo: 'two', attrThree: 'three' };
    service.registerType({
      type: 'known-type-1',
      attributesToEncrypt: new Set(['attrOne', 'attrThree']),
    });

    mockEncrypt
      .mockResolvedValueOnce('Successfully encrypted attrOne')
      .mockRejectedValueOnce(new Error('Something went wrong with attrThree...'));

    await expect(
      service.encryptAttributes({ type: 'known-type-1', id: 'object-id' }, attributes)
    ).rejects.toThrowError(EncryptionError);

    expect(attributes).toEqual({
      attrOne: 'one',
      attrTwo: 'two',
      attrThree: 'three',
    });
    expect(mockAuditLogger.encryptAttributesSuccess).not.toHaveBeenCalled();
    expect(mockAuditLogger.encryptAttributeFailure).toHaveBeenCalledTimes(1);
    expect(mockAuditLogger.encryptAttributeFailure).toHaveBeenCalledWith('attrThree', {
      type: 'known-type-1',
      id: 'object-id',
    });
  });
});

describe('#decryptAttributes', () => {
  it('does not decrypt attributes for unknown types', async () => {
    const attributes = { attrOne: 'one', attrTwo: 'two', attrThree: 'three' };

    await expect(
      service.decryptAttributes({ type: 'unknown-type', id: 'object-id' }, attributes)
    ).resolves.toEqual({
      attrOne: 'one',
      attrTwo: 'two',
      attrThree: 'three',
    });
    expect(mockAuditLogger.decryptAttributesSuccess).not.toHaveBeenCalled();
  });

  it('does not decrypt attributes for known, but not registered types', async () => {
    const attributes = { attrOne: 'one', attrTwo: 'two', attrThree: 'three' };

    await expect(
      service.decryptAttributes({ type: 'known-type-1', id: 'object-id' }, attributes)
    ).resolves.toEqual({
      attrOne: 'one',
      attrTwo: 'two',
      attrThree: 'three',
    });
    expect(mockAuditLogger.decryptAttributesSuccess).not.toHaveBeenCalled();
  });

  it('does not decrypt attributes that are not supposed to be decrypted', async () => {
    const attributes = { attrOne: 'one', attrTwo: 'two', attrThree: 'three' };

    service.registerType({ type: 'known-type-1', attributesToEncrypt: new Set(['attrFour']) });

    await expect(
      service.decryptAttributes({ type: 'known-type-1', id: 'object-id' }, attributes)
    ).resolves.toEqual({
      attrOne: 'one',
      attrTwo: 'two',
      attrThree: 'three',
    });
    expect(mockAuditLogger.decryptAttributesSuccess).not.toHaveBeenCalled();
  });

  it('decrypts only attributes that are supposed to be decrypted', async () => {
    const attributes = { attrOne: 'one', attrTwo: 'two', attrThree: 'three', attrFour: null };

    service.registerType({
      type: 'known-type-1',
      attributesToEncrypt: new Set(['attrOne', 'attrThree', 'attrFour']),
    });

    const encryptedAttributes = await service.encryptAttributes(
      { type: 'known-type-1', id: 'object-id' },
      attributes
    );
    expect(encryptedAttributes).toEqual({
      attrOne: expect.not.stringMatching(/^one$/),
      attrTwo: 'two',
      attrThree: expect.not.stringMatching(/^three$/),
      attrFour: null,
    });

    await expect(
      service.decryptAttributes({ type: 'known-type-1', id: 'object-id' }, encryptedAttributes)
    ).resolves.toEqual({
      attrOne: 'one',
      attrTwo: 'two',
      attrThree: 'three',
      attrFour: null,
    });
    expect(mockAuditLogger.decryptAttributesSuccess).toHaveBeenCalledTimes(1);
    expect(mockAuditLogger.decryptAttributesSuccess).toHaveBeenCalledWith(
      ['attrOne', 'attrThree'],
      { type: 'known-type-1', id: 'object-id' }
    );
  });

  it('decrypts only attributes that are supposed to be encrypted even if not all provided', async () => {
    const attributes = { attrTwo: 'two', attrThree: 'three' };

    service.registerType({
      type: 'known-type-1',
      attributesToEncrypt: new Set(['attrOne', 'attrThree']),
    });

    const encryptedAttributes = await service.encryptAttributes(
      { type: 'known-type-1', id: 'object-id' },
      attributes
    );
    expect(encryptedAttributes).toEqual({
      attrTwo: 'two',
      attrThree: expect.not.stringMatching(/^three$/),
    });

    await expect(
      service.decryptAttributes({ type: 'known-type-1', id: 'object-id' }, encryptedAttributes)
    ).resolves.toEqual({
      attrTwo: 'two',
      attrThree: 'three',
    });
    expect(mockAuditLogger.decryptAttributesSuccess).toHaveBeenCalledTimes(1);
    expect(mockAuditLogger.decryptAttributesSuccess).toHaveBeenCalledWith(['attrThree'], {
      type: 'known-type-1',
      id: 'object-id',
    });
  });

  it('decrypts if all attributes that contribute to AAD are present', async () => {
    const attributes = { attrOne: 'one', attrTwo: 'two', attrThree: 'three' };

    service.registerType({
      type: 'known-type-1',
      attributesToEncrypt: new Set(['attrThree']),
      attributesToExcludeFromAAD: new Set(['attrOne']),
    });

    const encryptedAttributes = await service.encryptAttributes(
      { type: 'known-type-1', id: 'object-id' },
      attributes
    );
    expect(encryptedAttributes).toEqual({
      attrOne: 'one',
      attrTwo: 'two',
      attrThree: expect.not.stringMatching(/^three$/),
    });

    const attributesWithoutAttr = { attrTwo: 'two', attrThree: encryptedAttributes.attrThree };

    await expect(
      service.decryptAttributes({ type: 'known-type-1', id: 'object-id' }, attributesWithoutAttr)
    ).resolves.toEqual({
      attrTwo: 'two',
      attrThree: 'three',
    });
    expect(mockAuditLogger.decryptAttributesSuccess).toHaveBeenCalledTimes(1);
    expect(mockAuditLogger.decryptAttributesSuccess).toHaveBeenCalledWith(['attrThree'], {
      type: 'known-type-1',
      id: 'object-id',
    });
  });

  it('decrypts even if attributes in AAD are defined in a different order', async () => {
    const attributes = { attrOne: 'one', attrTwo: 'two', attrThree: 'three' };

    service.registerType({
      type: 'known-type-1',
      attributesToEncrypt: new Set(['attrThree']),
    });

    const encryptedAttributes = await service.encryptAttributes(
      { type: 'known-type-1', id: 'object-id' },
      attributes
    );
    expect(encryptedAttributes).toEqual({
      attrOne: 'one',
      attrTwo: 'two',
      attrThree: expect.not.stringMatching(/^three$/),
    });

    const attributesInDifferentOrder = {
      attrThree: encryptedAttributes.attrThree,
      attrTwo: 'two',
      attrOne: 'one',
    };

    await expect(
      service.decryptAttributes(
        { type: 'known-type-1', id: 'object-id' },
        attributesInDifferentOrder
      )
    ).resolves.toEqual({
      attrOne: 'one',
      attrTwo: 'two',
      attrThree: 'three',
    });
    expect(mockAuditLogger.decryptAttributesSuccess).toHaveBeenCalledTimes(1);
    expect(mockAuditLogger.decryptAttributesSuccess).toHaveBeenCalledWith(['attrThree'], {
      type: 'known-type-1',
      id: 'object-id',
    });
  });

  it('decrypts if correct namespace is provided', async () => {
    const attributes = { attrOne: 'one', attrTwo: 'two', attrThree: 'three' };

    service.registerType({
      type: 'known-type-1',
      attributesToEncrypt: new Set(['attrThree']),
    });

    const encryptedAttributes = await service.encryptAttributes(
      { type: 'known-type-1', id: 'object-id', namespace: 'object-ns' },
      attributes
    );
    expect(encryptedAttributes).toEqual({
      attrOne: 'one',
      attrTwo: 'two',
      attrThree: expect.not.stringMatching(/^three$/),
    });

    await expect(
      service.decryptAttributes(
        { type: 'known-type-1', id: 'object-id', namespace: 'object-ns' },
        encryptedAttributes
      )
    ).resolves.toEqual({
      attrOne: 'one',
      attrTwo: 'two',
      attrThree: 'three',
    });
    expect(mockAuditLogger.decryptAttributesSuccess).toHaveBeenCalledTimes(1);
    expect(mockAuditLogger.decryptAttributesSuccess).toHaveBeenCalledWith(['attrThree'], {
      type: 'known-type-1',
      id: 'object-id',
      namespace: 'object-ns',
    });
  });

  it('decrypts even if no attributes are included into AAD', async () => {
    const attributes = { attrOne: 'one', attrThree: 'three' };
    service.registerType({
      type: 'known-type-1',
      attributesToEncrypt: new Set(['attrOne', 'attrThree']),
    });

    const encryptedAttributes = await service.encryptAttributes(
      { type: 'known-type-1', id: 'object-id' },
      attributes
    );
    expect(encryptedAttributes).toEqual({
      attrOne: expect.not.stringMatching(/^one$/),
      attrThree: expect.not.stringMatching(/^three$/),
    });

    await expect(
      service.decryptAttributes({ type: 'known-type-1', id: 'object-id' }, encryptedAttributes)
    ).resolves.toEqual({
      attrOne: 'one',
      attrThree: 'three',
    });
    expect(mockAuditLogger.decryptAttributesSuccess).toHaveBeenCalledTimes(1);
    expect(mockAuditLogger.decryptAttributesSuccess).toHaveBeenCalledWith(
      ['attrOne', 'attrThree'],
      { type: 'known-type-1', id: 'object-id' }
    );
  });

  it('decrypts non-string attributes and restores their original type', async () => {
    const attributes = {
      attrOne: 'one',
      attrTwo: 'two',
      attrThree: 'three',
      attrFour: null,
      attrFive: { nested: 'five' },
      attrSix: 6,
    };

    service.registerType({
      type: 'known-type-1',
      attributesToEncrypt: new Set(['attrOne', 'attrThree', 'attrFour', 'attrFive', 'attrSix']),
    });

    const encryptedAttributes = await service.encryptAttributes(
      { type: 'known-type-1', id: 'object-id' },
      attributes
    );
    expect(encryptedAttributes).toEqual({
      attrOne: expect.not.stringMatching(/^one$/),
      attrTwo: 'two',
      attrThree: expect.not.stringMatching(/^three$/),
      attrFour: null,
      attrFive: expect.any(String),
      attrSix: expect.any(String),
    });

    await expect(
      service.decryptAttributes({ type: 'known-type-1', id: 'object-id' }, encryptedAttributes)
    ).resolves.toEqual({
      attrOne: 'one',
      attrTwo: 'two',
      attrThree: 'three',
      attrFour: null,
      attrFive: { nested: 'five' },
      attrSix: 6,
    });
    expect(mockAuditLogger.decryptAttributesSuccess).toHaveBeenCalledTimes(1);
    expect(mockAuditLogger.decryptAttributesSuccess).toHaveBeenCalledWith(
      ['attrOne', 'attrThree', 'attrFive', 'attrSix'],
      { type: 'known-type-1', id: 'object-id' }
    );
  });

  describe('decryption failures', () => {
    let encryptedAttributes: Record<string, string>;
    beforeEach(async () => {
      const attributes = { attrOne: 'one', attrTwo: 'two', attrThree: 'three' };

      service.registerType({
        type: 'known-type-1',
        attributesToEncrypt: new Set(['attrThree']),
      });

      service.registerType({
        type: 'known-type-2',
        attributesToEncrypt: new Set(['attrThree']),
      });

      encryptedAttributes = await service.encryptAttributes(
        { type: 'known-type-1', id: 'object-id' },
        attributes
      );
    });

    it('fails to decrypt if not all attributes that contribute to AAD are present', async () => {
      const attributesWithoutAttr = { attrTwo: 'two', attrThree: encryptedAttributes.attrThree };
      await expect(
        service.decryptAttributes({ type: 'known-type-1', id: 'object-id' }, attributesWithoutAttr)
      ).rejects.toThrowError(EncryptionError);

      expect(mockAuditLogger.decryptAttributesSuccess).not.toHaveBeenCalled();
      expect(mockAuditLogger.decryptAttributeFailure).toHaveBeenCalledWith('attrThree', {
        type: 'known-type-1',
        id: 'object-id',
      });
    });

    it('fails to decrypt if ID does not match', async () => {
      await expect(
        service.decryptAttributes({ type: 'known-type-1', id: 'object-id*' }, encryptedAttributes)
      ).rejects.toThrowError(EncryptionError);

      expect(mockAuditLogger.decryptAttributesSuccess).not.toHaveBeenCalled();
      expect(mockAuditLogger.decryptAttributeFailure).toHaveBeenCalledWith('attrThree', {
        type: 'known-type-1',
        id: 'object-id*',
      });
    });

    it('fails to decrypt if type does not match', async () => {
      await expect(
        service.decryptAttributes({ type: 'known-type-2', id: 'object-id' }, encryptedAttributes)
      ).rejects.toThrowError(EncryptionError);

      expect(mockAuditLogger.decryptAttributesSuccess).not.toHaveBeenCalled();
      expect(mockAuditLogger.decryptAttributeFailure).toHaveBeenCalledWith('attrThree', {
        type: 'known-type-2',
        id: 'object-id',
      });
    });

    it('fails to decrypt if namespace does not match', async () => {
      encryptedAttributes = await service.encryptAttributes(
        { type: 'known-type-1', id: 'object-id', namespace: 'object-ns' },
        { attrOne: 'one', attrTwo: 'two', attrThree: 'three' }
      );

      await expect(
        service.decryptAttributes(
          { type: 'known-type-1', id: 'object-id', namespace: 'object-NS' },
          encryptedAttributes
        )
      ).rejects.toThrowError(EncryptionError);

      expect(mockAuditLogger.decryptAttributesSuccess).not.toHaveBeenCalled();
      expect(mockAuditLogger.decryptAttributeFailure).toHaveBeenCalledWith('attrThree', {
        type: 'known-type-1',
        id: 'object-id',
        namespace: 'object-NS',
      });
    });

    it('fails to decrypt if namespace is expected, but is not provided', async () => {
      encryptedAttributes = await service.encryptAttributes(
        { type: 'known-type-1', id: 'object-id', namespace: 'object-ns' },
        { attrOne: 'one', attrTwo: 'two', attrThree: 'three' }
      );

      await expect(
        service.decryptAttributes({ type: 'known-type-1', id: 'object-id' }, encryptedAttributes)
      ).rejects.toThrowError(EncryptionError);

      expect(mockAuditLogger.decryptAttributesSuccess).not.toHaveBeenCalled();
      expect(mockAuditLogger.decryptAttributeFailure).toHaveBeenCalledWith('attrThree', {
        type: 'known-type-1',
        id: 'object-id',
      });
    });

    it('fails to decrypt if encrypted attribute is defined, but not a string', async () => {
      await expect(
        service.decryptAttributes(
          { type: 'known-type-1', id: 'object-id' },
          {
            ...encryptedAttributes,
            attrThree: 2,
          }
        )
      ).rejects.toThrowError(
        'Encrypted "attrThree" attribute should be a string, but found number'
      );

      expect(mockAuditLogger.decryptAttributesSuccess).not.toHaveBeenCalled();
      expect(mockAuditLogger.decryptAttributeFailure).toHaveBeenCalledWith('attrThree', {
        type: 'known-type-1',
        id: 'object-id',
      });
    });

    it('fails to decrypt if encrypted attribute is not correct', async () => {
      await expect(
        service.decryptAttributes(
          { type: 'known-type-1', id: 'object-id' },
          {
            ...encryptedAttributes,
            attrThree: 'some-unknown-string',
          }
        )
      ).rejects.toThrowError(EncryptionError);

      expect(mockAuditLogger.decryptAttributesSuccess).not.toHaveBeenCalled();
      expect(mockAuditLogger.decryptAttributeFailure).toHaveBeenCalledWith('attrThree', {
        type: 'known-type-1',
        id: 'object-id',
      });
    });

    it('fails to decrypt if the AAD attribute has changed', async () => {
      await expect(
        service.decryptAttributes(
          { type: 'known-type-1', id: 'object-id' },
          {
            ...encryptedAttributes,
            attrOne: 'oNe',
          }
        )
      ).rejects.toThrowError(EncryptionError);

      expect(mockAuditLogger.decryptAttributesSuccess).not.toHaveBeenCalled();
      expect(mockAuditLogger.decryptAttributeFailure).toHaveBeenCalledWith('attrThree', {
        type: 'known-type-1',
        id: 'object-id',
      });
    });

    it('fails if encrypted with another encryption key', async () => {
      service = new EncryptedSavedObjectsService(
        'encryption-key-abc*',
        ['known-type-1'],
        { debug: jest.fn(), error: jest.fn() } as any,
        mockAuditLogger
      );

      service.registerType({
        type: 'known-type-1',
        attributesToEncrypt: new Set(['attrThree']),
      });

      await expect(
        service.decryptAttributes({ type: 'known-type-1', id: 'object-id' }, encryptedAttributes)
      ).rejects.toThrowError(EncryptionError);

      expect(mockAuditLogger.decryptAttributesSuccess).not.toHaveBeenCalled();
      expect(mockAuditLogger.decryptAttributeFailure).toHaveBeenCalledWith('attrThree', {
        type: 'known-type-1',
        id: 'object-id',
      });
    });
  });
});
