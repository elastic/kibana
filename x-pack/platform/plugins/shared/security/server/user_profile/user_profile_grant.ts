/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Represents a union of all possible user profile grant types.
 */
export type UserProfileGrant =
  | PasswordUserProfileGrant
  | AccessTokenUserProfileGrant
  | UiamAccessTokenUserProfileGrant;

/**
 * The user profile grant represented by the username and password.
 */
export interface PasswordUserProfileGrant {
  readonly type: 'password';
  readonly username: string;
  readonly password: string;
}

/**
 * The user profile grant represented by the access token.
 */
export interface AccessTokenUserProfileGrant {
  readonly type: 'accessToken';
  readonly accessToken: string;
}

/**
 * The user profile grant represented by the UIAM session access token and shared secret.
 */
export interface UiamAccessTokenUserProfileGrant {
  readonly type: 'uiamAccessToken';
  readonly accessToken: string;
  readonly sharedSecret: string;
}
