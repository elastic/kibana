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

import { TSearchStrategyProvider } from 'src/plugins/data/server';
import { exec, spawn } from 'child_process';
import uuid from 'uuid';
import fs from 'fs';
import { EQL_SEARCH_STRATEGY } from '../common';

function sleep(ms: number) {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}

export const eqlSearchStrategyProvider: TSearchStrategyProvider<typeof EQL_SEARCH_STRATEGY> = (
  context,
  caller
) => {
  return {
    search: request => {
      console.log('EQL Search Request on: ' + JSON.stringify(request));
      return new Promise(async (resolve, reject) => {
        const tmpIndexName = `${uuid.v4()}-eql-${request.indexPattern.substring(
          0,
          request.indexPattern.length - 1
        )}`;
        await caller('indices.create', { index: tmpIndexName });
        const response = await caller('search', { index: request.indexPattern, size: 1000 });

        if (request.indexPattern !== 'endgame-*') {
          const stream = fs.createWriteStream(`../eql_data/${tmpIndexName}.jsonl`, { flags: 'a' });

          console.log(
            `Creating EQL jsonl file from index ${request.indexPattern} with ${response.hits.hits.length} rows `
          );
          response.hits.hits.forEach(hit => {
            stream.write(JSON.stringify(hit._source) + '\n');
          });

          stream.end();
        }

        const execCommand = `eql query '${request.eql}' -f ../eql_data/${
          request.indexPattern === 'endgame-*' ? request.indexPattern : tmpIndexName
        }.jsonl`;

        console.log("Exec'ing command ", execCommand);
        exec(execCommand, { maxBuffer: 99048 * 500 }, async (err, stdout, stderr) => {
          if (err) {
            // node couldn't execute the command
            console.log('err is ', err);
            resolve({});
            return;
          }

          if (stderr) {
            console.log(`stderr: ${stderr}`);
            resolve({});
            return;
          }

          const mappingsResponse = await caller('indices.getMapping', {
            index: request.indexPattern,
          });
          const mappings = mappingsResponse[Object.keys(mappingsResponse)[0]].mappings;
          await caller('indices.putMapping', { index: tmpIndexName, body: mappings });

          if (stdout) {
            const results = stdout.split('\n');
            console.log(`EQL search returned ${results.length} results for ${execCommand} `);
            for (let i = 0; i < results.length; i++) {
              try {
                const doc = JSON.parse(results[i]);
                await caller('index', { index: tmpIndexName, body: doc });
              } catch (e) {
                console.error(e);
                console.log('error parsing result ' + results[i]);
              }
            }

            console.log(`Completed indexing ${results.length} into index ${tmpIndexName}`);
            setTimeout(() => resolve({ index: tmpIndexName }), 1000);
          } else {
            console.log(`EQL search for ${execCommand} returned no results`);
            resolve({ index: tmpIndexName });
          }
        });
      });
    },
  };
};
