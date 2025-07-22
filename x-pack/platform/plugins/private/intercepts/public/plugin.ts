/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import { InterceptPrompter } from './prompter';
import type { ServerConfigSchema } from '../common/config';

export class InterceptPublicPlugin implements Plugin {
  private readonly prompter?: InterceptPrompter;
  private interceptsTargetDomElement?: HTMLDivElement;

  constructor(initializerContext: PluginInitializerContext) {
    const { enabled } = initializerContext.config.get<ServerConfigSchema>();

    if (enabled) {
      this.prompter = new InterceptPrompter();
    }
  }

  public setup(core: CoreSetup) {
    this.prompter?.setup({
      analytics: core.analytics,
      notifications: core.notifications,
    });

    return {};
  }

  public start(core: CoreStart) {
    this.interceptsTargetDomElement = document.createElement('div');

    const prompterStart = this.prompter?.start({
      http: core.http,
      analytics: core.analytics,
      rendering: core.rendering,
      targetDomElement: this.interceptsTargetDomElement,
    });

    return {
      registerIntercept: prompterStart?.registerIntercept.bind(prompterStart),
    };
  }

  public stop() {
    this.interceptsTargetDomElement?.remove();
  }
}

export type InterceptsSetup = ReturnType<InterceptPublicPlugin['setup']>;
export type InterceptsStart = ReturnType<InterceptPublicPlugin['start']>;
