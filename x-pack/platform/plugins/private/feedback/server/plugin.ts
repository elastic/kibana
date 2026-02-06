/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Plugin } from '@kbn/core/server';
import { feedbackSubmittedEventType } from './src';
import { registerSendFeedbackRoute } from './routes';

export class FeedbackPlugin implements Plugin {
  public setup(core: CoreSetup) {
    core.analytics.registerEventType(feedbackSubmittedEventType);

    const router = core.http.createRouter();
    registerSendFeedbackRoute(router, core.analytics);

    return {};
  }

  public start() {
    return {};
  }

  public stop() {}
}
