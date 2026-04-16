/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  OAUTH_CALLBACK_QUERY_PARAMS,
  OAUTH_BROADCAST_CHANNEL_NAME,
  type OAuthAuthorizationStatus,
} from '@kbn/actions-plugin/common';

export { OAUTH_BROADCAST_CHANNEL_NAME };

interface OAuthFlowCompletedMessageBase {
  connectorId: string;
  statusCode: number;
}

export interface OAuthFlowCompletedSuccessMessage extends OAuthFlowCompletedMessageBase {
  status: OAuthAuthorizationStatus.Success;
}

export interface OAuthFlowCompletedErrorMessage extends OAuthFlowCompletedMessageBase {
  status: OAuthAuthorizationStatus.Error;
  error: string;
}

export type OAuthFlowCompletedMessage =
  | OAuthFlowCompletedSuccessMessage
  | OAuthFlowCompletedErrorMessage;

/**
 * Strips all OAuth callback query parameters from a URL string.
 *
 * @param urlStr - An absolute URL string to sanitize.
 * @returns The URL string with OAuth callback query parameters removed.
 */
export const stripOAuthCallbackQueryParams = (urlStr: string): string => {
  const url = new URL(urlStr);
  Object.values(OAUTH_CALLBACK_QUERY_PARAMS).forEach((param) => {
    url.searchParams.delete(param);
  });
  return url.toString();
};
