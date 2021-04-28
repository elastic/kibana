/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Stream } from 'stream';
import Zlib from 'zlib';
import type { Plugin, CoreSetup, PluginInitializerContext } from 'kibana/server';

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));
export class StreamCompressionPlugin implements Plugin {
  constructor(initializerContext: PluginInitializerContext) {}

  public setup(core: CoreSetup) {
    core.http.resources.register(
      {
        path: '/stream_compression',
        validate: false,
      },
      async (context, request, response) => {
        const output = new Stream.PassThrough();

        async function dataGenerator() {
          for (let index = 0; index < 10; index++) {
            output.write(index.toString().repeat(1_000));
            await delay(1_000);
          }
          output.end();
        }

        dataGenerator();

        return response.ok({
          body: output.pipe(
            Zlib.createGzip({
              // flush immediately as soon as data written. might degrade compression level
              flush: Zlib.constants.Z_FULL_FLUSH,
            })
          ),
          headers: {
            'Transfer-Encoding': 'gzip, chunked',
          },
        });
      }
    );
  }
  public start() {}
  public stop() {}
}
