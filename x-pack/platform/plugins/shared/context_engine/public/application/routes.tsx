/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Route, Routes } from '@kbn/shared-ux-router';
import React from 'react';
import { ContextLandingPage } from './context_landing_page';
import { AiIndexDetailPage } from './pages/ai_index_detail_page';
import { CreateAiIndexPage } from './pages/create_ai_index_page';
import { CONTEXT_ENGINE_PATHS } from './paths';

export const ContextEngineRoutes = () => (
  <Routes>
    <Route path={CONTEXT_ENGINE_PATHS.create} exact component={CreateAiIndexPage} />
    <Route path={CONTEXT_ENGINE_PATHS.detail} exact component={AiIndexDetailPage} />
    <Route path={CONTEXT_ENGINE_PATHS.landing} exact component={ContextLandingPage} />
  </Routes>
);
