/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Routes, Route } from '@kbn/shared-ux-router';
import React from 'react';
import { useUiSetting } from '@kbn/kibana-react-plugin/public';
import { OnechatToolsPage } from './pages/tools';
import { OnechatChatPage } from './pages/chat';
import { ONECHAT_TOOLS_UI_SETTING_ID } from '../../common/constants';

export const OnechatRoutes: React.FC<{}> = () => {
  const isToolsPageEnabled = useUiSetting<boolean>(ONECHAT_TOOLS_UI_SETTING_ID, false);
  return (
    <Routes>
      <Route path="/conversations/:conversationId">
        <OnechatChatPage />
      </Route>
      <Route path="/">
        <OnechatChatPage />
      </Route>
      {isToolsPageEnabled && (
        <Route path="/tools">
          <OnechatToolsPage />
        </Route>
      )}
    </Routes>
  );
};
