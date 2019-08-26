/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
import { SavedObject } from 'src/core/server';
import { SODatabaseAdapter } from '../saved_objets_database/adapter_types';
import { TokenType, Token, TokenAdapter as TokenAdapterType } from './adapter_types';

const SAVED_OBJECT_TYPE = 'tokens';

/**
 * Token adapter that persist tokens using saved objects
 */
export class TokenAdapter implements TokenAdapterType {
  constructor(private readonly soAdapter: SODatabaseAdapter) {}

  public async create({
    type,
    tokenHash,
    active,
    config,
    expire_at,
  }: {
    type: TokenType;
    tokenHash: string;
    active: boolean;
    expire_at?: string;
    config: { id: string; sharedId: string };
  }): Promise<Token> {
    const so = await this.soAdapter.create(SAVED_OBJECT_TYPE, {
      created_at: moment().toISOString(),
      type,
      tokenHash,
      config_id: config.id,
      config_shared_id: config.sharedId,
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

    return tokens.length > 0 ? tokens[0] : null;
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

  private _savedObjectToToken({ error, attributes }: SavedObject<Token>): Token {
    if (error) {
      throw new Error(error.message);
    }

    return {
      ...attributes,
    };
  }
}
