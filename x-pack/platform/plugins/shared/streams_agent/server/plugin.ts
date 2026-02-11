/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CoreSetup,
  CoreStart,
  Plugin,
  PluginInitializerContext,
  Logger,
} from '@kbn/core/server';
import { registerStreamsAgent } from './agent/register_streams_agent';
import { registerTools } from './tools/register_tools';
import type {
  StreamsAgentPluginSetup,
  StreamsAgentPluginSetupDependencies,
  StreamsAgentPluginStart,
  StreamsAgentPluginStartDependencies,
} from './types';

export class StreamsAgentPlugin
  implements
    Plugin<
      StreamsAgentPluginSetup,
      StreamsAgentPluginStart,
      StreamsAgentPluginSetupDependencies,
      StreamsAgentPluginStartDependencies
    >
{
  private readonly logger: Logger;

  constructor(initContext: PluginInitializerContext) {
    this.logger = initContext.logger.get();
  }

  public setup(
    core: CoreSetup<StreamsAgentPluginStartDependencies, StreamsAgentPluginStart>,
    plugins: StreamsAgentPluginSetupDependencies
  ): StreamsAgentPluginSetup {
    registerStreamsAgent({ core, plugins, logger: this.logger }).catch((error) => {
      this.logger.error(`Error registering streams agent: ${error}`);
    });

    registerTools({ core, plugins, logger: this.logger }).catch((error) => {
      this.logger.error(`Error registering streams agent tools: ${error}`);
    });

    return {};
  }

  public start(
    _core: CoreStart,
    _plugins: StreamsAgentPluginStartDependencies
  ): StreamsAgentPluginStart {
    return {};
  }

  public stop() {}
}
