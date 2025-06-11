/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export enum AuthType {
  Basic = 'webhook-authentication-basic',
  SSL = 'webhook-authentication-ssl',
  OAuth2 = 'webhook-authentication-oauth2',
}

export enum SSLCertType {
  CRT = 'ssl-crt-key',
  PFX = 'ssl-pfx',
}

export enum WebhookMethods {
  PATCH = 'patch',
  POST = 'post',
  PUT = 'put',
  GET = 'get',
}
