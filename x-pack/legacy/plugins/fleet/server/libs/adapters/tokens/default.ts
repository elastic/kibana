/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
import { SavedObject } from 'src/core/server';
import { SODatabaseAdapter } from '../saved_objects_database/adapter_types';
import { TokenType, Token, TokenAdapter as TokenAdapterType } from './adapter_types';
import { EncryptedSavedObjects } from '../encrypted_saved_objects/default';
import { FrameworkUser } from '../framework/adapter_types';

const SAVED_OBJECT_TYPE = 'tokens';

function getFirstOrNull(list: Token[]) {
  return list.length > 0 ? list[0] : null;
}

/**
 * Token adapter that persist tokens using saved objects
 */
export class TokenAdapter implements TokenAdapterType {
  constructor(
    private readonly soAdapter: SODatabaseAdapter,
    private readonly encryptedSavedObject: EncryptedSavedObjects
  ) {}

  public async create(
    user: FrameworkUser,
    {
      type,
      token,
      tokenHash,
      active,
      policy,
      expire_at,
    }: {
      type: TokenType;
      token: string;
      tokenHash: string;
      active: boolean;
      expire_at?: string;
      policy: { id: string; sharedId: string };
    }
  ): Promise<Token> {
    if (user.kind !== 'authenticated') {
      throw new Error('Only authenticated can update tokens');
    }
    const so = await this.soAdapter.create(user, SAVED_OBJECT_TYPE, {
      created_at: moment().toISOString(),
      type,
      token,
      tokenHash,
      policy_id: policy.id,
      policy_shared_id: policy.sharedId,
      expire_at,
      active,
      enrollment_rules: [],
    });

    return {
      id: so.id,
      ...so.attributes,
    };
  }

  public async getByTokenHash(user: FrameworkUser, tokenHash: string): Promise<Token | null> {
    const res = await this.soAdapter.find(user, {
      type: SAVED_OBJECT_TYPE,
      searchFields: ['tokenHash'],
      search: tokenHash,
    });

    const tokens = res.saved_objects.map(this._savedObjectToToken);
    const token = getFirstOrNull(tokens);
    return token ? await this._getDecrypted(token.id) : null;
  }

  public async getByPolicyId(user: FrameworkUser, policyId: string): Promise<Token | null> {
    const res = await this.soAdapter.find(user, {
      type: SAVED_OBJECT_TYPE,
      searchFields: ['policy_id'],
      search: policyId,
    });

    const tokens = res.saved_objects.map(this._savedObjectToToken);
    const token = getFirstOrNull(tokens);

    return token ? await this._getDecrypted(token.id) : null;
  }

  public async update(user: FrameworkUser, id: string, newData: Partial<Token>): Promise<void> {
    if (user.kind !== 'authenticated') {
      throw new Error('Only authenticated can update tokens');
    }
    const { error } = await this.soAdapter.update(user, SAVED_OBJECT_TYPE, id, newData);

    if (error) {
      throw new Error(error.message);
    }
  }

  public async delete(user: FrameworkUser, id: string): Promise<void> {
    await this.soAdapter.delete(user, SAVED_OBJECT_TYPE, id);
  }

  private async _getDecrypted(tokenId: string) {
    return this._savedObjectToToken(
      await this.encryptedSavedObject.getDecryptedAsInternalUser(SAVED_OBJECT_TYPE, tokenId)
    );
  }

  private _savedObjectToToken({ error, attributes, id }: SavedObject<Token>): Token {
    if (error) {
      throw new Error(error.message);
    }

    return {
      id,
      ...attributes,
    };
  }
}
