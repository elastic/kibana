/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render } from 'react-dom';
import { LegacyCoreStart, PluginInitializerContext } from 'src/core/public';
import { PluginsStart } from 'ui/new_platform/new_platform';
import { Chrome } from 'ui/chrome';

import { SiemApp } from './start_app';
import template from './template.html';
import { DEFAULT_KBN_VERSION, DEFAULT_TIMEZONE_BROWSER } from '../../common/constants';

export const ROOT_ELEMENT_ID = 'react-siem-root';

export type StartCore = LegacyCoreStart;
export type StartPlugins = Required<Pick<PluginsStart, 'data'>>;

export class Plugin {
  constructor(
    // @ts-ignore this is added to satisfy the New Platform typing constraint,
    // but we're not leveraging any of its functionality yet.
    private readonly initializerContext: PluginInitializerContext,
    private readonly chrome: Chrome
  ) {
    this.chrome = chrome;
  }

  public start(core: StartCore, plugins: StartPlugins) {
    // TODO(rylnd): once we're on NP, we can populate version from env.packageInfo
    core.uiSettings.set(DEFAULT_KBN_VERSION, '8.0.0');
    core.uiSettings.set(DEFAULT_TIMEZONE_BROWSER, 'UTC');

    // @ts-ignore improper type description
    this.chrome.setRootTemplate(template);
    const checkForRoot = () => {
      return new Promise(resolve => {
        const ready = !!document.getElementById(ROOT_ELEMENT_ID);
        if (ready) {
          resolve();
        } else {
          setTimeout(() => resolve(checkForRoot()), 10);
        }
      });
    };
    checkForRoot().then(() => {
      const node = document.getElementById(ROOT_ELEMENT_ID);
      if (node) {
        render(<SiemApp core={core} plugins={plugins} />, node);
      }
    });
  }
}
