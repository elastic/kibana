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
import fs from 'fs';
import expect from '@kbn/expect';
import { PluginFunctionalProviderContext } from '../../services';

// eslint-disable-next-line import/no-default-export
export default function ({ getService }: PluginFunctionalProviderContext) {
  const supertest = getService('supertest');

  describe('plugin logging', function describeIndexTests() {
    const LOG_FILE_DIRECTORY = resolve(__dirname, '..', '..', 'plugins', 'core_logging', 'server');
    const JSON_FILE_PATH = resolve(LOG_FILE_DIRECTORY, 'json_debug.log');
    const PATTERN_FILE_PATH = resolve(LOG_FILE_DIRECTORY, 'pattern_debug.log');

    beforeEach(async () => {
      // "touch" each file to ensure it exists and is empty before each test
      await fs.promises.writeFile(JSON_FILE_PATH, '');
      await fs.promises.writeFile(PATTERN_FILE_PATH, '');
    });

    async function readLines(path: string) {
      const contents = await fs.promises.readFile(path, { encoding: 'utf8' });
      return contents.trim().split('\n');
    }

    async function readJsonLines() {
      return (await readLines(JSON_FILE_PATH))
        .filter((line) => line.length > 0)
        .map((line) => JSON.parse(line))
        .map(({ level, message, context }) => ({ level, message, context }));
    }

    function writeLog(context: string[], level: string, message: string) {
      return supertest
        .post('/internal/core-logging/write-log')
        .set('kbn-xsrf', 'anything')
        .send({ context, level, message })
        .expect(200);
    }

    function setContextConfig(enable: boolean) {
      return supertest
        .post('/internal/core-logging/update-config')
        .set('kbn-xsrf', 'anything')
        .send({ enableCustomConfig: enable })
        .expect(200);
    }

    it('does not write to custom appenders when not configured', async () => {
      await setContextConfig(false);
      await writeLog(['debug_json'], 'info', 'i go to the default appender!');
      expect(await readJsonLines()).to.eql([]);
    });

    it('writes debug_json context to custom JSON appender', async () => {
      await setContextConfig(true);
      await writeLog(['debug_json'], 'debug', 'log1');
      await writeLog(['debug_json'], 'info', 'log2');
      expect(await readJsonLines()).to.eql([
        {
          level: 'DEBUG',
          context: 'plugins.core_logging.debug_json',
          message: 'log1',
        },
        {
          level: 'INFO',
          context: 'plugins.core_logging.debug_json',
          message: 'log2',
        },
      ]);
    });

    it('writes info_json context to custom JSON appender', async () => {
      await setContextConfig(true);
      await writeLog(['info_json'], 'debug', 'i should not be logged!');
      await writeLog(['info_json'], 'info', 'log2');
      expect(await readJsonLines()).to.eql([
        {
          level: 'INFO',
          context: 'plugins.core_logging.info_json',
          message: 'log2',
        },
      ]);
    });

    it('writes debug_pattern context to custom pattern appender', async () => {
      await setContextConfig(true);
      await writeLog(['debug_pattern'], 'debug', 'log1');
      await writeLog(['debug_pattern'], 'info', 'log2');
      expect(await readLines(PATTERN_FILE_PATH)).to.eql([
        'CUSTOM - PATTERN [plugins.core_logging.debug_pattern][DEBUG] log1',
        'CUSTOM - PATTERN [plugins.core_logging.debug_pattern][INFO ] log2',
      ]);
    });

    it('writes info_pattern context to custom pattern appender', async () => {
      await setContextConfig(true);
      await writeLog(['info_pattern'], 'debug', 'i should not be logged!');
      await writeLog(['info_pattern'], 'info', 'log2');
      expect(await readLines(PATTERN_FILE_PATH)).to.eql([
        'CUSTOM - PATTERN [plugins.core_logging.info_pattern][INFO ] log2',
      ]);
    });

    it('writes all context to both appenders', async () => {
      await setContextConfig(true);
      await writeLog(['all'], 'debug', 'log1');
      await writeLog(['all'], 'info', 'log2');
      expect(await readJsonLines()).to.eql([
        {
          level: 'DEBUG',
          context: 'plugins.core_logging.all',
          message: 'log1',
        },
        {
          level: 'INFO',
          context: 'plugins.core_logging.all',
          message: 'log2',
        },
      ]);
      expect(await readLines(PATTERN_FILE_PATH)).to.eql([
        'CUSTOM - PATTERN [plugins.core_logging.all][DEBUG] log1',
        'CUSTOM - PATTERN [plugins.core_logging.all][INFO ] log2',
      ]);
    });
  });
}
