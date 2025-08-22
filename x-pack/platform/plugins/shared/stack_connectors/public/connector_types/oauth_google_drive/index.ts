/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazy } from 'react';
import { i18n } from '@kbn/i18n';
import type { ActionTypeModel as ConnectorTypeModel } from '@kbn/triggers-actions-ui-plugin/public';
import type { GenericValidationResult } from '@kbn/triggers-actions-ui-plugin/public/types';
interface ValidationErrors {
  subAction: string[];
  body: string[];
}

import type {
  OAuthGoogleDriveConfig,
  OAuthGoogleDriveQueryActionParams,
  OAuthGoogleDriveSecrets,
  SUB_ACTION,
} from '../../../common/oauth_google_drive/everything';
import { OAUTH_GOOGLE_DRIVE_CONNECTOR_ID } from '../../../common/oauth_google_drive/everything';

export interface OAuthGoogleDriveActionParams {
  subAction: SUB_ACTION.QUERY;
  subActionParams: OAuthGoogleDriveQueryActionParams;
}

export type OAuthGoogleDriveConnector = ConnectorTypeModel<
  OAuthGoogleDriveConfig,
  OAuthGoogleDriveSecrets,
  OAuthGoogleDriveActionParams
>;

export function getOAuthGoogleDriveConnectorType(): OAuthGoogleDriveConnector {
  return {
    id: OAUTH_GOOGLE_DRIVE_CONNECTOR_ID,
    iconClass: lazy(() => import('./logo')),
    selectMessage: i18n.translate('xpack.stackConnectors.components.helloWorld.selectMessageText', {
      defaultMessage: 'Just a connector that uses OAuth to connect to Google Drive!',
    }),
    actionTypeTitle: i18n.translate(
      'xpack.stackConnectors.components.helloWorld.connectorTypeTitle',
      {
        defaultMessage: 'OAuth Google Drive',
      }
    ),
    validateParams: async (
      actionParams: OAuthGoogleDriveActionParams
    ): Promise<GenericValidationResult<ValidationErrors>> => {
      const errors: ValidationErrors = {
        body: [],
        subAction: [],
      };

      return { errors };
    },
    actionConnectorFields: lazy(() => import('./connector')),
    actionParamsFields: lazy(() => import('./params')),
  };
}
