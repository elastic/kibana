/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';

import type { SubActionConnectorType } from '@kbn/actions-plugin/server/sub_action_framework/types';

export const OAuthGoogleDriveConfigSchema = schema.object({});

export const OAuthGoogleDriveSecretsSchema = schema.object({});

export type OAuthGoogleDriveConfig = TypeOf<typeof OAuthGoogleDriveConfigSchema>;
export type OAuthGoogleDriveSecrets = TypeOf<typeof OAuthGoogleDriveSecretsSchema>;

export type OAuthGoogleDriveSecurityConnectorType = SubActionConnectorType<
  OAuthGoogleDriveConfig,
  OAuthGoogleDriveSecrets
>;

// Run query schema
export const OAuthGoogleDriveQueryActionParamsSchema = schema.object({
  query: schema.string(),
});

export const OAuthGoogleDriveQueryActionResponseSchema = schema.object(
  {
    data: schema.arrayOf(schema.string()),
    authLink: schema.maybe(schema.string()),
  },
  { unknowns: 'ignore' }
);

// Run get content schema
export const OAuthGoogleDriveGetContentActionParamsSchema = schema.object({
  fileId: schema.string(),
});

export const OAuthGoogleDriveGetContentActionResponseSchema = schema.object(
  {
    content: schema.maybe(schema.string()),
    authLink: schema.maybe(schema.string()),
  },
  { unknowns: 'ignore' }
);

export type OAuthGoogleDriveQueryActionParams = TypeOf<
  typeof OAuthGoogleDriveQueryActionParamsSchema
>;
export type OAuthGoogleDriveQueryActionResponse = TypeOf<
  typeof OAuthGoogleDriveQueryActionResponseSchema
>;

export type OAuthGoogleDriveGetContentActionParams = TypeOf<
  typeof OAuthGoogleDriveGetContentActionParamsSchema
>;
export type OAuthGoogleDriveGetContentActionResponse = TypeOf<
  typeof OAuthGoogleDriveGetContentActionResponseSchema
>;

export enum SUB_ACTION {
  QUERY = 'query',
  DOWNLOAD = 'download',
}

export const OAUTH_GOOGLE_DRIVE_CONNECTOR_ID = '.oauth_google_drive';
export const OAUTH_GOOGLE_DRIVE_TITLE = i18n.translate(
  'xpack.stackConnectors.components.helloWorld.connectorTypeTitle',
  {
    defaultMessage: 'OAUTH GOOGLE DRIVE',
  }
);

export class CredentialStorage {
  store: { [Key: string]: string };
  /**
   *
   */
  constructor() {
    this.store = {};
  }

  public get(key: string): string | null {
    console.log('GETTING FROM STORE');
    console.log(this.store);
    if (key in this.store) {
      return this.store[key];
    }
    return null;
  }

  public set(key: string, value: string) {
    this.store[key] = value;
    console.log('UPDATED STORE');
    console.log(this.store);
  }
}
