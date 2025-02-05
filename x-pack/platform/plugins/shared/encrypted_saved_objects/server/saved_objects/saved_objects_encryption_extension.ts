/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  EncryptedObjectDescriptor,
  ISavedObjectsEncryptionExtension,
  ISavedObjectTypeRegistry,
  SavedObject,
} from '@kbn/core-saved-objects-server';
import type { AuthenticatedUser } from '@kbn/security-plugin/common';

import { getDescriptorNamespace } from './get_descriptor_namespace';
import type { EncryptedSavedObjectsService } from '../crypto';

/**
 * @internal Only exported for unit testing.
 */
export interface Params {
  baseTypeRegistry: ISavedObjectTypeRegistry;
  service: Readonly<EncryptedSavedObjectsService>;
  getCurrentUser: () => Promise<AuthenticatedUser | undefined>;
}

export class SavedObjectsEncryptionExtension implements ISavedObjectsEncryptionExtension {
  readonly _baseTypeRegistry: ISavedObjectTypeRegistry;
  readonly _service: Readonly<EncryptedSavedObjectsService>;
  readonly _getCurrentUser: () => Promise<AuthenticatedUser | undefined>;

  constructor({ baseTypeRegistry, service, getCurrentUser }: Params) {
    this._baseTypeRegistry = baseTypeRegistry;
    this._service = service;
    this._getCurrentUser = getCurrentUser;
  }

  isEncryptableType(type: string) {
    return this._service.isRegistered(type);
  }

  shouldEnforceRandomId(type: string) {
    return this._service.shouldEnforceRandomId(type);
  }

  async decryptOrStripResponseAttributes<T, R extends SavedObject<T>>(
    response: R,
    originalAttributes?: T
  ): Promise<R> {
    if (response.attributes && this._service.isRegistered(response.type)) {
      const namespace = response.namespaces ? response.namespaces[0] : undefined;
      const normalizedDescriptor = {
        id: response.id,
        type: response.type,
        namespace: getDescriptorNamespace(this._baseTypeRegistry, response.type, namespace),
      };
      const user = await this._getCurrentUser();
      // Error is returned when decryption fails, and in this case encrypted attributes will be
      // stripped from the returned attributes collection. That will let consumer decide whether to
      // fail or handle recovery gracefully.
      const { attributes, error } = await this._service.stripOrDecryptAttributes(
        normalizedDescriptor,
        response.attributes as Record<string, unknown>,
        originalAttributes as Record<string, unknown>,
        { user }
      );

      return { ...response, attributes, ...(error && { error }) };
    }

    return response;
  }

  async encryptAttributes<T extends Record<string, unknown>>(
    descriptor: EncryptedObjectDescriptor,
    attributes: T
  ): Promise<T> {
    if (!this._service.isRegistered(descriptor.type)) {
      return attributes;
    }

    const { type, id, namespace } = descriptor;

    const normalizedDescriptor = {
      type,
      id,
      namespace: getDescriptorNamespace(this._baseTypeRegistry, type, namespace),
    };
    const user = await this._getCurrentUser();
    return this._service.encryptAttributes(normalizedDescriptor, attributes, { user });
  }
}
