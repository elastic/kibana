/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { resolve } from 'path';
import { Subject } from 'rxjs';
import { schema } from '@kbn/config-schema';
import type {
  PluginInitializerContext,
  Plugin,
  CoreSetup,
  LoggerContextConfigInput,
  Logger,
} from '../../../../../src/core/server';

const CUSTOM_LOGGING_CONFIG: LoggerContextConfigInput = {
  appenders: {
    customJsonFile: {
      kind: 'file',
      path: resolve(__dirname, 'json_debug.log'), // use 'debug.log' suffix so file watcher does not restart server
      layout: {
        kind: 'json',
      },
    },
    customPatternFile: {
      kind: 'file',
      path: resolve(__dirname, 'pattern_debug.log'),
      layout: {
        kind: 'pattern',
        pattern: 'CUSTOM - PATTERN [%logger][%level] %message',
      },
    },
  },

  loggers: [
    { context: 'debug_json', appenders: ['customJsonFile'], level: 'debug' },
    { context: 'debug_pattern', appenders: ['customPatternFile'], level: 'debug' },
    { context: 'info_json', appenders: ['customJsonFile'], level: 'info' },
    { context: 'info_pattern', appenders: ['customPatternFile'], level: 'info' },
    { context: 'all', appenders: ['customJsonFile', 'customPatternFile'], level: 'debug' },
  ],
};

export class CoreLoggingPlugin implements Plugin {
  private readonly logger: Logger;

  constructor(init: PluginInitializerContext) {
    this.logger = init.logger.get();
  }

  public setup(core: CoreSetup) {
    const loggingConfig$ = new Subject<LoggerContextConfigInput>();
    core.logging.configure(loggingConfig$);

    const router = core.http.createRouter();

    // Expose a route that allows our test suite to write logs as this plugin
    router.post(
      {
        path: '/internal/core-logging/write-log',
        validate: {
          body: schema.object({
            level: schema.oneOf([schema.literal('debug'), schema.literal('info')]),
            message: schema.string(),
            context: schema.arrayOf(schema.string()),
          }),
        },
      },
      (ctx, req, res) => {
        const { level, message, context } = req.body;
        const logger = this.logger.get(...context);

        if (level === 'debug') {
          logger.debug(message);
        } else if (level === 'info') {
          logger.info(message);
        }

        return res.ok();
      }
    );

    // Expose a route to toggle on and off the custom config
    router.post(
      {
        path: '/internal/core-logging/update-config',
        validate: { body: schema.object({ enableCustomConfig: schema.boolean() }) },
      },
      (ctx, req, res) => {
        if (req.body.enableCustomConfig) {
          loggingConfig$.next(CUSTOM_LOGGING_CONFIG);
        } else {
          loggingConfig$.next({});
        }

        return res.ok({ body: `Updated config: ${req.body.enableCustomConfig}` });
      }
    );
  }

  public start() {}
  public stop() {}
}
