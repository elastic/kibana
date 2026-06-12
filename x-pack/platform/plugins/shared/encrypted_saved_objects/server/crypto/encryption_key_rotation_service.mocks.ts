/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EncryptionKeyRotationService } from './encryption_key_rotation_service';

function createEncryptionKeyRotationServiceMock() {
  return { rotate: jest.fn() } as unknown as jest.Mocked<EncryptionKeyRotationService>;
}

export const encryptionKeyRotationServiceMock = {
  create: createEncryptionKeyRotationServiceMock,
};
