/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FrameworkAuthenticatedUser, FrameworkUser } from '../framework/adapter_types';
import { CMTokensAdapter, TokenEnrollmentData } from './adapter_types';

export class MemoryTokensAdapter implements CMTokensAdapter {
  private tokenDB: TokenEnrollmentData[];

  constructor(tokenDB: TokenEnrollmentData[]) {
    this.tokenDB = tokenDB;
  }

  public async deleteEnrollmentToken(user: FrameworkUser, enrollmentToken: string) {
    const index = this.tokenDB.findIndex(token => token.token === enrollmentToken);

    if (index > -1) {
      this.tokenDB.splice(index, 1);
    }
  }

  public async getEnrollmentToken(
    user: FrameworkUser,
    tokenString: string
  ): Promise<TokenEnrollmentData> {
    return new Promise<TokenEnrollmentData>(resolve => {
      return resolve(this.tokenDB.find(token => token.token === tokenString));
    });
  }

  public async insertTokens(user: FrameworkAuthenticatedUser, tokens: TokenEnrollmentData[]) {
    tokens.forEach(token => {
      const existingIndex = this.tokenDB.findIndex(t => t.token === token.token);
      if (existingIndex !== -1) {
        this.tokenDB[existingIndex] = token;
      } else {
        this.tokenDB.push(token);
      }
    });
    return tokens;
  }

  public setDB(tokenDB: TokenEnrollmentData[]) {
    this.tokenDB = tokenDB;
  }
}
