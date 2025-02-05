/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Client } from '@elastic/elasticsearch';
import { run } from '@kbn/dev-cli-runner';
import * as fastGlob from 'fast-glob';
import yargs from 'yargs';
import { castArray } from 'lodash';
// @ts-expect-error
import Mocha from 'mocha';
import Path from 'path';
import { EvaluateWith, options } from './cli';
import { getServiceUrls } from '../util/get_service_urls';
import { KibanaClient } from '../util/kibana_client';
import { initServices } from './services';
import { EvaluationResult } from './types';
import { selectConnector } from '../util/select_connector';
import { createInferenceEvaluationClient } from './evaluation_client';
import { createResultRenderer, renderFailedScenarios } from './table_renderer';

function runEvaluations() {
  yargs(process.argv.slice(2))
    .command('*', 'Run Inference evaluations', options, (argv) => {
      run(
        async ({ log }) => {
          const serviceUrls = await getServiceUrls({
            log,
            elasticsearch: argv.elasticsearch,
            kibana: argv.kibana,
          });

          const kibanaClient = new KibanaClient(log, serviceUrls.kibanaUrl, argv.spaceId);
          const esClient = new Client({
            node: serviceUrls.esUrl,
          });

          await kibanaClient.createSpaceIfNeeded();

          const connectors = await kibanaClient.getConnectors();
          if (!connectors.length) {
            throw new Error('No connectors found');
          }

          const connector = await selectConnector({
            connectors,
            preferredId: argv.connectorId,
            log,
          });

          log.info(`Using connector ${connector.connectorId}`);

          const evaluationConnector =
            argv.evaluateWith === EvaluateWith.same
              ? connector
              : await selectConnector({
                  connectors,
                  preferredId:
                    argv.evaluateWith === EvaluateWith.other ? undefined : argv.evaluateWith,
                  log,
                  message: 'Select a connector for evaluation',
                });

          log.info(`Using connector ${evaluationConnector.connectorId} for evaluation`);

          const scenarios =
            (argv.files !== undefined &&
              castArray(argv.files).map((file) => Path.join(process.cwd(), file))) ||
            fastGlob.sync(Path.join(__dirname, './scenarios/**/*.spec.ts'));

          if (!scenarios.length) {
            throw new Error('No scenarios to run');
          }

          const mocha = new Mocha({
            grep: argv.grep,
            timeout: '10m',
          });

          const chatClient = kibanaClient.createInferenceClient({
            connectorId: connector.connectorId,
          });

          const evaluationConnectorId = evaluationConnector.connectorId || connector.connectorId;

          const evaluationClient = createInferenceEvaluationClient({
            connectorId: connector.connectorId,
            evaluationConnectorId,
            outputApi: (parameters) =>
              chatClient.output({
                ...parameters,
                connectorId: evaluationConnectorId,
              }) as any,
            suite: mocha.suite,
          });

          const renderer = createResultRenderer();
          const results: EvaluationResult[] = [];
          const failedResults: EvaluationResult[] = [];

          evaluationClient.onResult((result) => {
            results.push(result);
            if (result.scores.filter((score) => score.score < 1).length) {
              failedResults.push(result);
            }

            log.write(renderer.render({ result }));
          });

          initServices({
            kibanaClient,
            esClient,
            chatClient,
            evaluationClient,
            logger: log,
          });

          for (const filename of scenarios) {
            mocha.addFile(filename);
          }

          return new Promise<void>((resolve, reject) => {
            mocha.run((failures: any) => {
              if (failures) {
                log.write(renderFailedScenarios(failedResults));
                reject(new Error(`Some tests failed`));
                return;
              }
              resolve();
            });
          }).finally(() => {
            const modelScore = results
              .flatMap((result) => result.scores)
              .reduce(
                (prev, result) => {
                  prev.score += result.score;
                  prev.total += 1;
                  return prev;
                },
                { score: 0, total: 0 }
              );

            log.write('-------------------------------------------');
            log.write(
              `Model ${connector.connectorId} scored ${modelScore.score} out of ${modelScore.total}`
            );
            log.write('-------------------------------------------');

            const scoresByCategory = results.reduce<{
              [key: string]: {
                score: number;
                total: number;
              };
            }>((acc, result) => {
              const category = result.category;
              if (!acc[category]) {
                acc[category] = { score: 0, total: 0 };
              }
              result.scores.forEach((score) => {
                acc[category].score += score.score;
                acc[category].total += 1;
              });
              return acc;
            }, {});

            log.write('-------------------------------------------');
            log.write(`Model ${connector.connectorId} scores per category`);
            Object.entries(scoresByCategory).forEach(([category, { score, total }]) => {
              log.write(`- category: ${category} - scored ${score} out of ${total}`);
            });
            log.write('-------------------------------------------');
          });
        },
        {
          log: {
            defaultLevel: argv.logLevel as any,
          },
          flags: {
            allowUnexpected: true,
          },
        }
      );
    })
    .parse();
}

runEvaluations();
