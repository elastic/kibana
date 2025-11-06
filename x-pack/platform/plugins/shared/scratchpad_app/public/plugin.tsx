/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppMountParameters } from '@kbn/core/public';
import {
  APP_WRAPPER_CLASS,
  DEFAULT_APP_CATEGORIES,
  type CoreSetup,
  type CoreStart,
  type Plugin,
  type PluginInitializerContext,
} from '@kbn/core/public';
import type { Logger } from '@kbn/logging';
import { dynamic } from '@kbn/shared-ux-utility';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/css';
import ReactDOM from 'react-dom';
import type {
  ConfigSchema,
  ScratchpadAppPublicSetup,
  ScratchpadAppPublicStart,
  ScratchpadAppSetupDependencies,
  ScratchpadAppStartDependencies,
} from './types';

const ScratchpadApplication = dynamic(() =>
  import('./application').then((mod) => ({ default: mod.ScratchpadApplication }))
);

export const renderApp = ({
  appMountParameters,
  coreStart,
  pluginsStart,
}: {
  appMountParameters: AppMountParameters;
  coreStart: CoreStart;
  pluginsStart: ScratchpadAppStartDependencies;
}) => {
  const { element } = appMountParameters;

  const appWrapperClassName = css`
    overflow: auto;
    height: 0;
  `;
  const appWrapperElement = document.getElementsByClassName(APP_WRAPPER_CLASS)[1];
  if (appWrapperElement) {
    appWrapperElement.classList.add(appWrapperClassName);
  }

  ReactDOM.render(
    <ScratchpadApplication
      coreStart={coreStart}
      pluginsStart={pluginsStart}
      appMountParameters={appMountParameters}
    />,
    element
  );
  return () => {
    ReactDOM.unmountComponentAtNode(element);
    if (appWrapperElement) {
      appWrapperElement.classList.remove(appWrapperClassName);
    }
  };
};

export class ScratchpadAppPlugin
  implements
    Plugin<
      ScratchpadAppPublicSetup,
      ScratchpadAppPublicStart,
      ScratchpadAppSetupDependencies,
      ScratchpadAppStartDependencies
    >
{
  logger: Logger;

  constructor(private readonly context: PluginInitializerContext<ConfigSchema>) {
    this.logger = this.context.logger.get();
  }

  setup(coreSetup: CoreSetup<ScratchpadAppStartDependencies>): ScratchpadAppPublicSetup {
    coreSetup.application.register({
      id: 'scratchpad',
      title: i18n.translate('xpack.scratchpad.appTitle', {
        defaultMessage: 'Scratchpad',
      }),
      euiIconType: 'document',
      appRoute: '/app/scratchpad',
      category: DEFAULT_APP_CATEGORIES.management,
      order: 10001,
      visibleIn: ['sideNav', 'globalSearch'],
      mount: async (appMountParameters: AppMountParameters<unknown>) => {
        // Load application bundle and Get start services
        const [coreStart, pluginsStart] = await coreSetup.getStartServices();

        return renderApp({
          appMountParameters,
          coreStart,
          pluginsStart,
        });
      },
    });

    return {};
  }

  start(
    coreStart: CoreStart,
    pluginsStart: ScratchpadAppStartDependencies
  ): ScratchpadAppPublicStart {
    return {};
  }
}
