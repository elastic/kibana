/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { OAuthAuthorizationStatus, OAUTH_CALLBACK_QUERY_PARAMS } from '@kbn/actions-plugin/common';
import { i18n } from '@kbn/i18n';
import {
  OAUTH_BROADCAST_CHANNEL_NAME,
  stripOAuthCallbackQueryParams,
  type OAuthFlowCompletedErrorMessage,
  type OAuthFlowCompletedSuccessMessage,
} from '../oauth';

export interface OAuthRedirectResultProps {
  onSuccess?: (connectorId: string) => void;
  onError?: (connectorId: string, error: Error) => void;
}

/**
 * Detects OAuth flow completion from URL query parameters set by the server-side
 * callback route. If the `auto_close` query parameter is present, it closes the
 * current tab after processing.
 *
 * Should be rendered in any page that serves as an OAuth return URL.
 */
export const useOAuthRedirectResult = ({
  onSuccess,
  onError,
}: OAuthRedirectResultProps = {}): void => {
  const location = useLocation();
  const history = useHistory();

  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);
  onSuccessRef.current = onSuccess;
  onErrorRef.current = onError;

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const oauthAuthorization = searchParams.get(OAUTH_CALLBACK_QUERY_PARAMS.AUTHORIZATION_STATUS);
    const connectorId = searchParams.get(OAUTH_CALLBACK_QUERY_PARAMS.CONNECTOR_ID);
    if (!oauthAuthorization || !connectorId) {
      return;
    }

    const broadcastChannel = new BroadcastChannel(OAUTH_BROADCAST_CHANNEL_NAME);
    const statusCodeRaw = searchParams.get(OAUTH_CALLBACK_QUERY_PARAMS.STATUS_CODE);
    const parsedStatusCode = statusCodeRaw != null ? Number(statusCodeRaw) : NaN;
    const statusCode = Number.isInteger(parsedStatusCode) ? parsedStatusCode : undefined;

    if (oauthAuthorization === OAuthAuthorizationStatus.Success) {
      onSuccessRef.current?.(connectorId);
      broadcastChannel.postMessage({
        connectorId,
        status: OAuthAuthorizationStatus.Success,
        statusCode: statusCode ?? 200,
      } as OAuthFlowCompletedSuccessMessage);
    } else {
      const error = searchParams.get(OAUTH_CALLBACK_QUERY_PARAMS.ERROR);
      const errorMessage =
        error ||
        i18n.translate('xpack.responseOpsOAuthHooks.redirectResultError', {
          defaultMessage: 'OAuth authorization failed',
        });
      onErrorRef.current?.(connectorId, new Error(errorMessage));
      broadcastChannel.postMessage({
        connectorId,
        status: OAuthAuthorizationStatus.Error,
        statusCode: statusCode ?? 500,
        error: errorMessage,
      } as OAuthFlowCompletedErrorMessage);
    }
    broadcastChannel.close();

    const autoClose = searchParams.get(OAUTH_CALLBACK_QUERY_PARAMS.AUTO_CLOSE);

    const updatedUrl = new URL(
      stripOAuthCallbackQueryParams(
        `${window.location.origin}${location.pathname}${location.search}`
      )
    );
    history.replace(`${updatedUrl.pathname}${updatedUrl.search}`);

    if (autoClose === 'true') {
      window.close();
    }
  }, [location.search, history, location.pathname]);
};
