/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import { toMountPoint } from '@kbn/react-kibana-mount';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/public';
import { filter, firstValueFrom } from 'rxjs';
import { FeedbackButton } from './feedback';
import { InterceptPrompter } from './prompter';
import type { ServerConfigSchema } from '../common/config';

export interface InterceptPublicStartDependencies {
  licensing: LicensingPluginStart;
}

export class InterceptPublicPlugin implements Plugin {
  private readonly prompter?: InterceptPrompter;
  private interceptsTargetDomElement?: HTMLDivElement;
  private isServerless: boolean;

  constructor(initializerContext: PluginInitializerContext) {
    const { enabled } = initializerContext.config.get<ServerConfigSchema>();
    this.isServerless = initializerContext.env.packageInfo.buildFlavor === 'serverless';

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

  public start(core: CoreStart, { licensing }: InterceptPublicStartDependencies) {
    this.interceptsTargetDomElement = document.createElement('div');

    const prompterStart = this.prompter?.start({
      http: core.http,
      analytics: core.analytics,
      rendering: core.rendering,
      targetDomElement: this.interceptsTargetDomElement,
    });

    firstValueFrom(
      core.analytics.telemetryCounter$.pipe(filter((counter) => counter.type === 'succeeded'))
    ).then((isNotAdblocked) => {
      if (isNotAdblocked) {
        core.chrome.navControls.registerRight({
          order: 1002,
          mount: toMountPoint(
            <FeedbackButton
              core={core}
              isServerless={this.isServerless}
              getLicense={licensing.getLicense}
            />,
            core.rendering
          ),
        });
      }
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
