/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const MESSAGE_REQUIRED = i18n.translate(
  'xpack.stackConnectors.components.slack_api.error.requiredSlackMessageText',
  {
    defaultMessage: 'Message is required.',
  }
);
export const CHANNEL_REQUIRED = i18n.translate(
  'xpack.stackConnectors.components.slack_api.error.requiredSlackChannel',
  {
    defaultMessage: 'Channel ID is required.',
  }
);
export const TOKEN_LABEL = i18n.translate(
  'xpack.stackConnectors.components.slack_api.tokenTextFieldLabel',
  {
    defaultMessage: 'API Token',
  }
);
export const WEB_API = i18n.translate('xpack.stackConnectors.components.slack_api.webApi', {
  defaultMessage: 'Web API',
});
export const SELECT_MESSAGE = i18n.translate(
  'xpack.stackConnectors.components.slack_api.selectMessageText',
  {
    defaultMessage: 'Send messages to Slack channels.',
  }
);
export const ACTION_TYPE_TITLE = i18n.translate(
  'xpack.stackConnectors.components.slack_api.connectorTypeTitle',
  {
    defaultMessage: 'Slack',
  }
);
export const ALLOWED_CHANNELS = i18n.translate(
  'xpack.stackConnectors.components.slack_api.allowedChannelsLabel',
  {
    defaultMessage: 'Allowed channel names',
  }
);

export const JSON_REQUIRED = i18n.translate(
  'xpack.stackConnectors.components.slack_api.error.slackBlockkitJsonRequired',
  {
    defaultMessage: 'Block kit must be valid JSON.',
  }
);

export const BLOCKS_REQUIRED = i18n.translate(
  'xpack.stackConnectors.components.slack_api.error.slackBlockkitBlockRequired',
  {
    defaultMessage: `JSON must contain field "blocks".`,
  }
);

export const OPTIONAL_LABEL = i18n.translate(
  'xpack.stackConnectors.components.slack_api.optionalLabel',
  {
    defaultMessage: 'Optional',
  }
);

export const CHANNEL_NAME_ERROR = i18n.translate(
  'xpack.stackConnectors.components.slack_api.channelNameError',
  {
    defaultMessage: 'Channel name must start with a #',
  }
);
