/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { UiSettingsServiceSetup } from '@kbn/core-ui-settings-server';
import { i18n } from '@kbn/i18n';
import {
  ONECHAT_AGENT_API_UI_SETTING_ID,
  ONECHAT_UI_SETTING_ID,
  ONECHAT_MCP_SERVER_UI_SETTING_ID,
  ONECHAT_TOOLS_UI_SETTING_ID,
} from '../common/constants';

export const registerUISettings = ({ uiSettings }: { uiSettings: UiSettingsServiceSetup }) => {
  uiSettings.register({
    [ONECHAT_MCP_SERVER_UI_SETTING_ID]: {
      description: i18n.translate('xpack.onechat.uiSettings.mcpServer.description', {
        defaultMessage: 'Enables MCP server with access to tools.',
      }),
      name: i18n.translate('xpack.onechat.uiSettings.mcpServer.name', {
        defaultMessage: 'MCP Server',
      }),
      schema: schema.boolean(),
      value: false,
      readonly: true,
      readonlyMode: 'ui',
    },
    [ONECHAT_UI_SETTING_ID]: {
      description: i18n.translate('xpack.onechat.uiSettings.chatUI.description', {
        defaultMessage: 'Enables the OneChat chat UI.',
      }),
      name: i18n.translate('xpack.onechat.uiSettings.chatUI.name', {
        defaultMessage: 'OneChat Chat UI',
      }),
      schema: schema.boolean(),
      value: false,
      readonly: true,
      readonlyMode: 'ui',
    },
    [ONECHAT_TOOLS_UI_SETTING_ID]: {
      description: i18n.translate('xpack.onechat.uiSettings.toolsPage.description', {
        defaultMessage: 'Enables the OneChat tools page.',
      }),
      name: i18n.translate('xpack.onechat.uiSettings.toolsPage.name', {
        defaultMessage: 'OneChat Tools Page',
      }),
      schema: schema.boolean(),
      value: false,
      readonly: true,
      readonlyMode: 'ui',
    },
    [ONECHAT_AGENT_API_UI_SETTING_ID]: {
      description: i18n.translate('xpack.onechat.uiSettings.agentApi.description', {
        defaultMessage: 'Enables the OneChat agent API.',
      }),
      name: i18n.translate('xpack.onechat.uiSettings.agentApi.name', {
        defaultMessage: 'OneChat Agent API',
      }),
      schema: schema.boolean(),
      value: false,
      readonly: true,
      readonlyMode: 'ui',
    },
  });
};
