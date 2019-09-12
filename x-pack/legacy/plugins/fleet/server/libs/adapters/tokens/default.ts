/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
import { SavedObject } from 'src/core/server';
import { SODatabaseAdapter } from '../saved_objets_database/adapter_types';
import { TokenType, Token, TokenAdapter as TokenAdapterType } from './adapter_types';
import { EncryptedSavedObjects } from '../encrypted_saved_objects/default';

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

  public async create({
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
  }): Promise<Token> {
    const so = await this.soAdapter.create(SAVED_OBJECT_TYPE, {
      created_at: moment().toISOString(),
      type,
      token,
      tokenHash,
      policy_id: policy.id,
      policy_shared_id: policy.sharedId,
      expire_at,
      active,
    });

    return {
      id: so.id,
      ...so.attributes,
    };
  }

  public async getByTokenHash(tokenHash: string): Promise<Token | null> {
    const res = await this.soAdapter.find({
      type: SAVED_OBJECT_TYPE,
      searchFields: ['tokenHash'],
      search: tokenHash,
    });

    const tokens = res.saved_objects.map(this._savedObjectToToken);
    const token = getFirstOrNull(tokens);
    return token ? await this._getDecrypted(token.id) : null;
  }

  public async getByPolicyId(policyId: string): Promise<Token | null> {
    const res = await this.soAdapter.find({
      type: SAVED_OBJECT_TYPE,
      searchFields: ['policy_id'],
      search: policyId,
    });

    const tokens = res.saved_objects.map(this._savedObjectToToken);
    const token = getFirstOrNull(tokens);
    return token ? await this._getDecrypted(token.id) : null;
  }

  public async update(id: string, newData: Partial<Token>): Promise<void> {
    const { error } = await this.soAdapter.update(SAVED_OBJECT_TYPE, id, newData);

    if (error) {
      throw new Error(error.message);
    }
  }

  public async delete(id: string): Promise<void> {
    await this.soAdapter.delete(SAVED_OBJECT_TYPE, id);
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
