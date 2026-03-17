/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import React from 'react';
import ReactDOM from 'react-dom';

export class KnowledgeMiningPlugin implements Plugin {
  setup(core: CoreSetup) {
    core.application.register({
      id: 'knowledgeMining',
      title: 'Knowledge Mining',
      visibleIn: [],
      mount: async (params) => {
        const [coreStart] = await core.getStartServices();
        const { KnowledgeMiningApp } = await import('./application');
        ReactDOM.render(<KnowledgeMiningApp coreStart={coreStart} />, params.element);
        return () => {
          ReactDOM.unmountComponentAtNode(params.element);
        };
      },
    });
  }

  start(core: CoreStart) {
    return {};
  }

  stop() {}
}
