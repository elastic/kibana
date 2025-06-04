/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Routes, Route } from '@kbn/shared-ux-router';
import React from 'react';
import { OnechatChatPage } from './pages/chat';

export const OnechatRoutes: React.FC<{}> = () => {
  return (
    <div>
      <h1>Routes!</h1>
      <Routes>
        <Route path="/chat">
          <OnechatChatPage />
        </Route>
        <Route path="/chat/conversations/:conversationId">
          <OnechatChatPage />
        </Route>
      </Routes>
    </div>
  );
};
