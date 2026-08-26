/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import { registerDefaultSyntaxGrammars } from '@kbn/adaptive-ui/syntax';
import type { AdaptiveUiConfig } from '../common/config';
import type {
  AdaptiveUiPluginSetup,
  AdaptiveUiPluginStart,
  PluginSetupDependencies,
  PluginStartDependencies,
} from './types';
import { registerAdaptiveUiAttachmentRenderers } from './attachment_types';
import { createViewRendererUiDefinition } from './renderers/view_renderer';
import { createAdaptiveUiShareProvider } from './share';

export class AdaptiveUiPlugin
  implements
    Plugin<
      AdaptiveUiPluginSetup,
      AdaptiveUiPluginStart,
      PluginSetupDependencies,
      PluginStartDependencies
    >
{
  private readonly config: AdaptiveUiConfig;
  private readonly isDev: boolean;

  constructor(initializerContext: PluginInitializerContext<AdaptiveUiConfig>) {
    this.config = initializerContext.config.get();
    this.isDev = initializerContext.env.mode.dev;
  }

  setup(
    _coreSetup: CoreSetup<PluginStartDependencies, AdaptiveUiPluginStart>,
    _setupDeps: PluginSetupDependencies
  ): AdaptiveUiPluginSetup {
    return {};
  }

  start(coreStart: CoreStart, { agentBuilder }: PluginStartDependencies): AdaptiveUiPluginStart {
    // Light up `codeBlock`/`diff` highlighting before any view renders. The
    // registry is process-global and idempotent, so a single call at start is enough.
    registerDefaultSyntaxGrammars();

    const { styleIsolation } = this.config;
    if (styleIsolation === 'document') {
      void import('./document_stylesheet');
    }

    // Temporary invocation shim over the `view` renderer; remove once the
    // `<render type="view">` directive and `/workspace/renders` VFS read API land.
    registerAdaptiveUiAttachmentRenderers(agentBuilder.attachments, coreStart, styleIsolation);
    agentBuilder.renderers.register(createViewRendererUiDefinition(coreStart, styleIsolation));
    agentBuilder.attachments.registerShareProvider(
      createAdaptiveUiShareProvider({ core: coreStart, isDev: this.isDev })
    );
    return {};
  }

  stop() {}
}
