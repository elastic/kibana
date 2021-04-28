/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type {
  AppMountParameters,
  Plugin,
  CoreSetup,
  PluginInitializerContext,
} from 'kibana/public';

export class StreamCompressionPlugin implements Plugin {
  constructor(initializerContext: PluginInitializerContext) {}

  public setup(core: CoreSetup) {
    // based on https://web.dev/fetch-upload-streaming/
    async function streamer(onClunk: (data: string) => void, onDone: () => void) {
      const response = await fetch('/stream_compression');
      const body = response.body;
      if (!body) return;
      const reader = body
        // DecompressionStream implemented in Chrome and friends only
        // https://developer.mozilla.org/en-US/docs/Web/API/DecompressionStream/DecompressionStream
        // download a polyfill if not available
        .pipeThrough(new DecompressionStream('gzip'))
        .pipeThrough(new TextDecoderStream())
        .getReader();

      while (true) {
        const { value, done } = await reader.read();
        if (value) {
          onClunk(value);
        }
        if (done) {
          onDone();
          break;
        }
      }
    }
    core.application.register({
      id: 'stream_compression',
      title: 'stream compression demo',
      mount: async (params: AppMountParameters) => {
        streamer(
          function onChunk(chunk: string) {
            const childElement = document.createElement('div');
            childElement.setAttribute('data-test-subj', 'streamChunk');
            childElement.append(document.createTextNode(chunk));
            params.element.append(childElement);
          },
          function onDone() {
            const childElement = document.createElement('div');
            childElement.setAttribute('data-test-subj', 'endOfStream');
            params.element.append(childElement);
          }
        );
        return () => {
          params.element.innerHTML = '';
        };
      },
    });
  }
  public start() {}
  public stop() {}
}
