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

export const ROOT_ELEMENT_ID = 'react-siem-root';

export interface StartObject {
  core: LegacyCoreStart;
  plugins: PluginsStart;
}

export class Plugin {
  constructor(
    // @ts-ignore this is added to satisfy the New Platform typing constraint,
    // but we're not leveraging any of its functionality yet.
    private readonly initializerContext: PluginInitializerContext,
    private readonly chrome: Chrome
  ) {
    this.chrome = chrome;
  }

  public start(start: StartObject): void {
    const { core, plugins } = start;
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
