/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createVerify } from 'crypto';

import type { KibanaRequest } from '@kbn/core-http-server';
import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { EncryptedSavedObjectsClient } from '@kbn/encrypted-saved-objects-plugin/server';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';
import { loggingSystemMock } from '@kbn/core/server/mocks';

import { MESSAGE_SIGNING_KEYS_SAVED_OBJECT_TYPE } from '../../constants';
import { createAppContextStartContractMock } from '../../mocks';
import { appContextService } from '..';

import {
  type MessageSigningServiceInterface,
  MessageSigningService,
} from './message_signing_service';

describe('MessageSigningService', () => {
  let soClientMock: jest.Mocked<SavedObjectsClientContract>;
  let esoClientMock: jest.Mocked<EncryptedSavedObjectsClient>;
  let messageSigningService: MessageSigningServiceInterface;

  function mockCreatePointInTimeFinderAsInternalUser(savedObjects: unknown[] = []) {
    esoClientMock.createPointInTimeFinderDecryptedAsInternalUser = jest.fn().mockResolvedValue({
      close: jest.fn(),
      find: function* asyncGenerator() {
        yield { saved_objects: savedObjects };
      },
    });
  }

  function mockCreatePointInTimeFinderAsInternalUserOnce(savedObjects: unknown[] = []) {
    esoClientMock.createPointInTimeFinderDecryptedAsInternalUser = jest
      .fn()
      .mockResolvedValueOnce({
        close: jest.fn(),
        find: function* asyncGenerator() {
          yield { saved_objects: savedObjects };
        },
      })
      .mockResolvedValueOnce({
        close: jest.fn(),
        find: function* asyncGenerator() {
          yield { saved_objects: [] };
        },
      });
  }

  function setupMocks(canEncrypt = true) {
    const mockContext = createAppContextStartContractMock();
    mockContext.encryptedSavedObjectsSetup = encryptedSavedObjectsMock.createSetup({
      canEncrypt,
    });
    appContextService.start(mockContext);
    esoClientMock =
      mockContext.encryptedSavedObjectsStart!.getClient() as jest.Mocked<EncryptedSavedObjectsClient>;
    soClientMock = appContextService
      .getSavedObjects()
      .getScopedClient({} as unknown as KibanaRequest) as jest.Mocked<SavedObjectsClientContract>;

    messageSigningService = new MessageSigningService(loggingSystemMock.create(), esoClientMock);
  }

  describe('with encryption key configured', () => {
    const keyPairObj = {
      id: 'id1',
      type: MESSAGE_SIGNING_KEYS_SAVED_OBJECT_TYPE,
      attributes: {
        private_key:
          'MIHsMFcGCSqGSIb3DQEFDTBKMCkGCSqGSIb3DQEFDDAcBAgtNcDFoj07+QICCAAwDAYIKoZIhvcNAgkFADAdBglghkgBZQMEASoEELajFPDz2bpD2qfPCRHphAgEgZCq0eUxTOEGrefdeNgHR2VVxXjWRZG+cGn+e8LW4auBCwwMiZsAZPKKvzLdlLi5sQhH+qWPM7Z9/OLbF/0ZKvyDM2/+4/9+5Iwna7vueTZtcdSIuGIFRjqUZbgNLejPSPcBMM9SP1V6I8TjDguGAQ3Nj95t7g7cbl0x48nQZ9bNDJyvy4ytHl+ubzdanLlFkLc=',
        public_key:
          'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE6E5aKP8dAa+TlBuSKrrgl9UtkzHjn6YUQO+72vi3khGfUQIpD9qq9MsjsWz6Bvm6tnSOyyPXv+Koh80lNCKw5A==',
        passphrase: 'eb35af2291344a51c9a8bb81e653281c38892d564db617a2cb0bc660f0ae96f2',
      },
    };

    beforeEach(() => {
      setupMocks();
    });

    afterEach(() => {
      jest.resetAllMocks();
    });

    it('can correctly generate key pair if none exist', async () => {
      mockCreatePointInTimeFinderAsInternalUser();

      const generateKeyPairResponse = await messageSigningService.generateKeyPair();
      expect(soClientMock.create).toBeCalledWith(MESSAGE_SIGNING_KEYS_SAVED_OBJECT_TYPE, {
        private_key: expect.any(String),
        public_key: expect.any(String),
        passphrase: expect.any(String),
      });

      expect(generateKeyPairResponse).toEqual({
        passphrase: expect.any(String),
        privateKey: expect.any(String),
        publicKey: expect.any(String),
      });
    });

    it('can correctly rotate existing key pair', async () => {
      mockCreatePointInTimeFinderAsInternalUserOnce([keyPairObj]);

      await messageSigningService.rotateKeyPair();

      expect(soClientMock.delete).toBeCalledWith(
        MESSAGE_SIGNING_KEYS_SAVED_OBJECT_TYPE,
        keyPairObj.id
      );
      expect(soClientMock.create).toBeCalledWith(MESSAGE_SIGNING_KEYS_SAVED_OBJECT_TYPE, {
        private_key: expect.any(String),
        public_key: expect.any(String),
        passphrase: expect.any(String),
      });
    });

    it('does not generate key pair on rotation if no key pair exists', async () => {
      // no previous key pair
      mockCreatePointInTimeFinderAsInternalUserOnce([]);

      const response = messageSigningService.rotateKeyPair();
      await expect(response).rejects.toThrowError(
        'Error rotating key pair: Error fetching current key pair: No current key pair found!'
      );
    });

    it('throws `getCurrentKeyPairObj` error if any on rotate', async () => {
      mockCreatePointInTimeFinderAsInternalUserOnce([keyPairObj]);
      // mock delete to throw
      jest
        .spyOn(messageSigningService, 'getCurrentKeyPairObj' as any)
        .mockRejectedValue(Error('foo'));

      const response = messageSigningService.rotateKeyPair();
      await expect(response).rejects.toThrowError(
        'Error rotating key pair: Error fetching current key pair: foo'
      );
    });

    it('throws `soClient` `delete` error if any on rotate', async () => {
      mockCreatePointInTimeFinderAsInternalUserOnce([keyPairObj]);
      // mock delete to throw
      soClientMock.delete.mockRejectedValue(Error('foo'));

      const response = messageSigningService.rotateKeyPair();
      await expect(response).rejects.toThrowError(
        'Error rotating key pair: Error deleting current key pair: foo'
      );
    });

    it('throws `soClient` `create` error if any on rotate', async () => {
      mockCreatePointInTimeFinderAsInternalUserOnce([keyPairObj]);
      // mock delete to throw
      soClientMock.create.mockRejectedValue(Error('foo'));

      const response = messageSigningService.rotateKeyPair();
      await expect(response).rejects.toThrowError(
        'Error rotating key pair: Error creating key pair: foo'
      );
    });

    it('throws `generateKeyPair` error if any on rotate', async () => {
      mockCreatePointInTimeFinderAsInternalUserOnce([keyPairObj]);
      // mock delete to throw
      messageSigningService.generateKeyPair = jest.fn().mockRejectedValue(Error('foo'));

      const response = messageSigningService.rotateKeyPair();
      await expect(response).rejects.toThrowError('Error rotating key pair: foo');
    });

    it('does not generate key pair if one exists', async () => {
      mockCreatePointInTimeFinderAsInternalUser([keyPairObj]);

      const generateKeyPairResponse = await messageSigningService.generateKeyPair();
      expect(soClientMock.create).not.toBeCalled();

      expect(generateKeyPairResponse).toEqual({
        passphrase: expect.any(String),
        privateKey: expect.any(String),
        publicKey: expect.any(String),
      });
    });

    it('can correctly sign messages', async () => {
      mockCreatePointInTimeFinderAsInternalUser([keyPairObj]);

      const message = Buffer.from(JSON.stringify({ message: 'foobar' }), 'utf8');
      const { data, signature } = await messageSigningService.sign(message);

      const verifier = createVerify('SHA256');
      verifier.update(data);
      verifier.end();

      const serializedPublicKey = await messageSigningService.getPublicKey();
      const publicKey = Buffer.from(serializedPublicKey, 'base64');
      const isVerified = verifier.verify(
        { key: publicKey, format: 'der', type: 'spki' },
        signature,
        'base64'
      );
      expect(isVerified).toBe(true);
      expect(data).toBe(message);
    });

    it('will retry getting keypair if ESO error', async () => {
      esoClientMock.createPointInTimeFinderDecryptedAsInternalUser = jest
        .fn()
        .mockRejectedValueOnce(new Error('some error'))
        .mockRejectedValueOnce(new Error('another error'))
        .mockResolvedValueOnce({
          close: jest.fn(),
          find: function* asyncGenerator() {
            yield { saved_objects: [] };
          },
        });

      const generateKeyPairResponse = await messageSigningService.generateKeyPair();
      expect(esoClientMock.createPointInTimeFinderDecryptedAsInternalUser).toBeCalledTimes(3);
      expect(soClientMock.create).toHaveBeenLastCalledWith(MESSAGE_SIGNING_KEYS_SAVED_OBJECT_TYPE, {
        private_key: expect.any(String),
        public_key: expect.any(String),
        passphrase: expect.any(String),
      });

      expect(generateKeyPairResponse).toEqual({
        passphrase: expect.any(String),
        privateKey: expect.any(String),
        publicKey: expect.any(String),
      });
    });
  });

  describe('with NO encryption key configured', () => {
    const keyPairObj = {
      id: 'id1',
      type: MESSAGE_SIGNING_KEYS_SAVED_OBJECT_TYPE,
      attributes: {
        private_key:
          'MIHsMFcGCSqGSIb3DQEFDTBKMCkGCSqGSIb3DQEFDDAcBAgtNcDFoj07+QICCAAwDAYIKoZIhvcNAgkFADAdBglghkgBZQMEASoEELajFPDz2bpD2qfPCRHphAgEgZCq0eUxTOEGrefdeNgHR2VVxXjWRZG+cGn+e8LW4auBCwwMiZsAZPKKvzLdlLi5sQhH+qWPM7Z9/OLbF/0ZKvyDM2/+4/9+5Iwna7vueTZtcdSIuGIFRjqUZbgNLejPSPcBMM9SP1V6I8TjDguGAQ3Nj95t7g7cbl0x48nQZ9bNDJyvy4ytHl+ubzdanLlFkLc=',
        public_key:
          'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE6E5aKP8dAa+TlBuSKrrgl9UtkzHjn6YUQO+72vi3khGfUQIpD9qq9MsjsWz6Bvm6tnSOyyPXv+Koh80lNCKw5A==',
        passphrase_plain: 'eb35af2291344a51c9a8bb81e653281c38892d564db617a2cb0bc660f0ae96f2',
      },
    };

    beforeEach(() => {
      setupMocks(false);
    });

    afterEach(() => {
      jest.resetAllMocks();
    });

    it('can correctly generate key pair if none exist', async () => {
      mockCreatePointInTimeFinderAsInternalUser();

      await messageSigningService.generateKeyPair();
      expect(soClientMock.create).toBeCalledWith(MESSAGE_SIGNING_KEYS_SAVED_OBJECT_TYPE, {
        private_key: expect.any(String),
        public_key: expect.any(String),
        passphrase_plain: expect.any(String),
      });
    });

    it('encrypts passphrase when encryption key is newly configured', async () => {
      setupMocks();
      mockCreatePointInTimeFinderAsInternalUser([keyPairObj]);

      await messageSigningService.generateKeyPair();
      expect(soClientMock.create).not.toBeCalled();
      expect(soClientMock.update).toBeCalledWith(
        MESSAGE_SIGNING_KEYS_SAVED_OBJECT_TYPE,
        keyPairObj.id,
        {
          ...keyPairObj.attributes,
          passphrase: keyPairObj.attributes.passphrase_plain,
          passphrase_plain: '',
        }
      );
    });
  });
});
