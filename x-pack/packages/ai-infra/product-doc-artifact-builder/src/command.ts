/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Path from 'path';
import yargs from 'yargs';
import { REPO_ROOT } from '@kbn/repo-info';
import { DocumentationProduct } from '@kbn/product-doc-common';
import type { TaskConfig } from './types';
import { buildArtifacts } from './build_artifacts';

function options(y: yargs.Argv) {
  return y
    .option('productName', {
      describe: 'name of products to generate documentation for',
      array: true,
      choices: Object.values(DocumentationProduct),
      default: [DocumentationProduct.kibana],
    })
    .option('stackVersion', {
      describe: 'The stack version to generate documentation for',
      string: true,
      default: '8.16', // TODO: master is on 9.0 now, not sure we can default to version in package.json?
    })
    .option('targetFolder', {
      describe: 'The folder to generate the artifacts in',
      string: true,
      default: Path.join(REPO_ROOT, 'build', 'kb-artifacts'),
    })
    .option('buildFolder', {
      describe: 'The folder to use for temporary files',
      string: true,
      default: Path.join(REPO_ROOT, 'build', 'temp-kb-artifacts'),
    })
    .option('sourceClusterUrl', {
      describe: 'The source cluster url',
      string: true,
      demandOption: true,
      default: process.env.KIBANA_SOURCE_CLUSTER_URL,
    })
    .option('sourceClusterUsername', {
      describe: 'The source cluster username',
      string: true,
      demandOption: true,
      default: process.env.KIBANA_SOURCE_CLUSTER_USERNAME,
    })
    .option('sourceClusterPassword', {
      describe: 'The source cluster password',
      string: true,
      demandOption: true,
      default: process.env.KIBANA_SOURCE_CLUSTER_PASSWORD,
    })
    .option('embeddingClusterUrl', {
      describe: 'The embedding cluster url',
      string: true,
      demandOption: true,
      default: process.env.KIBANA_EMBEDDING_CLUSTER_URL,
    })
    .option('embeddingClusterUsername', {
      describe: 'The embedding cluster username',
      string: true,
      demandOption: true,
      default: process.env.KIBANA_EMBEDDING_CLUSTER_USERNAME,
    })
    .option('embeddingClusterPassword', {
      describe: 'The embedding cluster password',
      string: true,
      demandOption: true,
      default: process.env.KIBANA_EMBEDDING_CLUSTER_PASSWORD,
    })
    .locale('en');
}

export function runScript() {
  yargs(process.argv.slice(2))
    .command('*', 'Build knowledge base artifacts', options, async (argv) => {
      // argv contains additional entries - let's keep our input clear
      const taskConfig: TaskConfig = {
        productNames: argv.productName,
        stackVersion: argv.stackVersion,
        buildFolder: argv.buildFolder,
        targetFolder: argv.targetFolder,
        sourceClusterUrl: argv.sourceClusterUrl!,
        sourceClusterUsername: argv.sourceClusterUsername!,
        sourceClusterPassword: argv.sourceClusterPassword!,
        embeddingClusterUrl: argv.embeddingClusterUrl!,
        embeddingClusterUsername: argv.embeddingClusterUsername!,
        embeddingClusterPassword: argv.embeddingClusterPassword!,
      };

      return buildArtifacts(taskConfig);
    })
    .parse();
}
