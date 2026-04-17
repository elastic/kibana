/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  PostBlockkitSubActionParams,
  PostMessageSubActionParams,
  UpdateMessageSubActionParams,
  ValidChannelIdSubActionParams,
} from '@kbn/connector-schemas/slack_api';
import type { SlackApiService } from '../../../common/slack_api/types';

const validChannelIdHandler = async ({
  externalService,
  params: { channelId },
}: {
  externalService: SlackApiService;
  params: ValidChannelIdSubActionParams;
}) => await externalService.validChannelId(channelId ?? '');

const postMessageHandler = async ({
  externalService,
  params: { channelIds, channels, text, channelNames },
}: {
  externalService: SlackApiService;
  params: PostMessageSubActionParams;
}) => await externalService.postMessage({ channelIds, channels, channelNames, text });

const postBlockkitHandler = async ({
  externalService,
  params: { channelIds, channels, channelNames, text },
}: {
  externalService: SlackApiService;
  params: PostBlockkitSubActionParams;
}) => await externalService.postBlockkit({ channelIds, channels, channelNames, text });

const updateMessageHandler = async ({
  externalService,
  params,
}: {
  externalService: SlackApiService;
  params: UpdateMessageSubActionParams;
}) => await externalService.updateMessage(params);

export const api = {
  validChannelId: validChannelIdHandler,
  postMessage: postMessageHandler,
  postBlockkit: postBlockkitHandler,
  updateMessage: updateMessageHandler,
};
