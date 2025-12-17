/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazy } from 'react';
import type {
  ActionTypeModel as ConnectorTypeModel,
  GenericValidationResult,
} from '@kbn/triggers-actions-ui-plugin/public/types';
import { CONNECTOR_ID as SLACK_CONNECTOR_ID } from '@kbn/connector-schemas/slack/constants';
import { CONNECTOR_ID as SLACK_API_CONNECTOR_ID } from '@kbn/connector-schemas/slack_api/constants';
import type {
  PostBlockkitParams,
  PostMessageParams,
  SlackApiActionParams,
  SlackApiConfig,
  SlackApiSecrets,
} from '@kbn/connector-schemas/slack_api';
import {
  ACTION_TYPE_TITLE,
  CHANNEL_REQUIRED,
  MESSAGE_REQUIRED,
  SELECT_MESSAGE,
  JSON_REQUIRED,
  BLOCKS_REQUIRED,
} from './translations';
import type { SlackActionParams } from '../types';
import { subtype } from '../slack/slack';

const isChannelValid = (channels?: string[], channelIds?: string[]) => {
  if (
    (channels === undefined && !channelIds?.length) ||
    (channelIds === undefined && !channels?.length) ||
    (!channelIds?.length && !channels?.length)
  ) {
    return false;
  }
  return true;
};

export const getConnectorType = (): ConnectorTypeModel<
  SlackApiConfig,
  SlackApiSecrets,
  PostMessageParams | PostBlockkitParams
> => ({
  id: SLACK_API_CONNECTOR_ID,
  subtype,
  // Hide slack api connector in UI when when slack connector is enabled in config
  getHideInUi: (actionTypes) =>
    actionTypes.find((actionType) => actionType.id === SLACK_CONNECTOR_ID)?.enabledInConfig ===
    true,
  modalWidth: 675,
  iconClass: 'logoSlack',
  selectMessage: SELECT_MESSAGE,
  actionTypeTitle: ACTION_TYPE_TITLE,
  validateParams: async (
    actionParams: SlackApiActionParams
  ): Promise<GenericValidationResult<unknown>> => {
    const errors = {
      text: new Array<string>(),
      channels: new Array<string>(),
    };
    const validationResult = { errors };
    if (actionParams.subAction === 'postMessage' || actionParams.subAction === 'postBlockkit') {
      if (!actionParams.subActionParams.text) {
        errors.text.push(MESSAGE_REQUIRED);
      }
      if (
        !isChannelValid(
          actionParams.subActionParams.channels,
          actionParams.subActionParams.channelIds
        )
      ) {
        errors.channels.push(CHANNEL_REQUIRED);
      }

      if (actionParams.subAction === 'postBlockkit' && actionParams.subActionParams.text) {
        try {
          const blockkitJson = JSON.parse(actionParams.subActionParams.text);
          if (!Object.hasOwn(blockkitJson, 'blocks')) {
            errors.text.push(BLOCKS_REQUIRED);
          }
        } catch {
          errors.text.push(JSON_REQUIRED);
        }
      }
    }
    return validationResult;
  },
  actionConnectorFields: lazy(() => import('./slack_connectors')),
  actionParamsFields: lazy(() => import('./slack_params')),
  convertParamsBetweenGroups: (
    params: SlackActionParams | PostMessageParams | PostBlockkitParams
  ): SlackActionParams | PostMessageParams | PostBlockkitParams | {} => {
    if ('message' in params) {
      return {
        subAction: 'postMessage',
        subActionParams: {
          channels: [],
          text: params.message,
        },
      };
    } else if ('subAction' in params) {
      return params;
    }
    return {};
  },
});
