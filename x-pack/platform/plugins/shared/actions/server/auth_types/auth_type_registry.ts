/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import Boom from '@hapi/boom';
import type { NormalizedAuthType } from '@kbn/connector-specs';
import { i18n } from '@kbn/i18n';

export class AuthTypeRegistry {
  private readonly authTypes: Map<string, NormalizedAuthType> = new Map();

  constructor() {}

  /**
   * Returns if the auth type registry has the given action type registered
   */
  public has(id: string) {
    return this.authTypes.has(id);
  }

  /**
   * Registers an auth type
   */
  public register(authType: NormalizedAuthType) {
    if (this.has(authType.id)) {
      throw new Error(
        i18n.translate('xpack.actions.authTypeRegistry.register.duplicateAuthTypeErrorMessage', {
          defaultMessage: 'Auth type "{id}" is already registered.',
          values: {
            id: authType.id,
          },
        })
      );
    }

    if (!(authType.schema instanceof z.ZodObject)) {
      throw new Error(
        i18n.translate('xpack.actions.authTypeRegistry.register.invalidAuthTypeSchema', {
          defaultMessage: 'Auth type "{id}" has an invalid schema.',
          values: {
            id: authType.id,
          },
        })
      );
    }

    this.authTypes.set(authType.id, { ...authType });
  }

  /**
   * Returns an auth type, throws if not registered
   */
  public get(id: string): NormalizedAuthType {
    if (!this.has(id)) {
      throw Boom.badRequest(
        i18n.translate('xpack.actions.authTypeRegistry.get.missingAuthTypeErrorMessage', {
          defaultMessage: 'Auth type "{id}" is not registered.',
          values: {
            id,
          },
        })
      );
    }
    return this.authTypes.get(id)! as NormalizedAuthType;
  }

  public getAllTypes(): string[] {
    return Array.from(this.authTypes).map(([authTypeId]) => authTypeId);
  }
}
