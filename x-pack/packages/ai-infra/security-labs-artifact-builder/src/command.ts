/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Path from 'path';
import yargs from 'yargs';
import { REPO_ROOT } from '@kbn/repo-info';
import { getSecurityLabsUtcTimestampVersion } from '@kbn/product-doc-common';
import { DEFAULT_ELSER } from './tasks/create_index';
import type { TaskConfig } from './types';
import { buildArtifact } from './build_artifact';

// Source of truth for Security Labs articles: the elastic.co Contentstack stack.
const SECURITY_LABS_CONTENTSTACK_HOST = 'cdn.contentstack.io';
const SECURITY_LABS_CONTENTSTACK_ENVIRONMENT = 'production';
const SECURITY_LABS_CONTENTSTACK_LOCALE = 'en-us';

const parseList = (value: string): string[] =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

function options(y: yargs.Argv) {
  return y
    .version(false) // Disable built-in version flag to avoid conflict
    .option('artifactVersion', {
      alias: 'v',
      describe:
        'Artifact version (YYYY.MM.DD-HHMMSS UTC). Defaults to the current UTC timestamp so same-day publishes are unique.',
      string: true,
      default: process.env.SECURITY_LABS_VERSION ?? getSecurityLabsUtcTimestampVersion(),
    })
    .option('targetFolder', {
      describe: 'The folder to generate the artifact in',
      string: true,
      default: Path.join(REPO_ROOT, 'build', 'kb-artifacts'),
    })
    .option('buildFolder', {
      describe: 'The folder to use for temporary files',
      string: true,
      default: Path.join(REPO_ROOT, 'build', 'temp-kb-artifacts'),
    })
    .option('embeddingClusterUrl', {
      describe: 'The Elasticsearch cluster URL for generating embeddings',
      string: true,
      // Default to local ES for development
      default: process.env.KIBANA_EMBEDDING_CLUSTER_URL ?? 'http://localhost:9200',
    })
    .option('embeddingClusterUsername', {
      describe: 'The embedding cluster username',
      string: true,
      // Default to elastic for development
      default: process.env.KIBANA_EMBEDDING_CLUSTER_USERNAME ?? 'elastic',
    })
    .option('embeddingClusterPassword', {
      describe: 'The embedding cluster password',
      string: true,
      // Default to changeme for development
      default: process.env.KIBANA_EMBEDDING_CLUSTER_PASSWORD ?? 'changeme',
    })
    .option('contentstackHost', {
      describe:
        'Contentstack Content Delivery API host for the Security Labs stack (must be a *cdn.contentstack.io/com host)',
      string: true,
      default: process.env.SECURITY_LABS_CONTENTSTACK_HOST ?? SECURITY_LABS_CONTENTSTACK_HOST,
    })
    .option('contentstackApiKey', {
      describe:
        'API key of the Contentstack stack that hosts Security Labs (required unless --localContentPath is set). Prefer the env var so it stays out of argv/logs.',
      string: true,
      default: process.env.SECURITY_LABS_CONTENTSTACK_API_KEY,
    })
    .option('contentstackDeliveryToken', {
      describe:
        'Read-only Contentstack delivery token (required unless --localContentPath is set). Prefer the env var so it stays out of argv/logs.',
      string: true,
      default: process.env.SECURITY_LABS_CONTENTSTACK_DELIVERY_TOKEN,
    })
    .option('contentstackEnvironment', {
      describe: 'Contentstack publishing environment to read published entries from',
      string: true,
      default:
        process.env.SECURITY_LABS_CONTENTSTACK_ENVIRONMENT ??
        SECURITY_LABS_CONTENTSTACK_ENVIRONMENT,
    })
    .option('contentstackLocale', {
      describe: 'Contentstack locale to read entries in',
      string: true,
      default: process.env.SECURITY_LABS_CONTENTSTACK_LOCALE ?? SECURITY_LABS_CONTENTSTACK_LOCALE,
    })
    .option('contentstackContentTypes', {
      describe:
        'Comma-separated Contentstack content type UIDs whose published entries are indexed',
      string: true,
      default: process.env.SECURITY_LABS_CONTENTSTACK_CONTENT_TYPES ?? '',
    })
    .option('localContentPath', {
      describe:
        'Local path to Security Labs markdown content (alternative to the Contentstack fetch)',
      string: true,
      // Check for common local paths
      default: process.env.SECURITY_LABS_CONTENT_PATH,
    })
    .option('inferenceId', {
      describe: 'The inference endpoint used to generate the semantic_text embeddings',
      string: true,
      default: process.env.SECURITY_LABS_INFERENCE_ID ?? DEFAULT_ELSER,
    })
    .locale('en')
    .example(
      'SECURITY_LABS_CONTENTSTACK_API_KEY=xxx SECURITY_LABS_CONTENTSTACK_DELIVERY_TOKEN=xxx $0 --contentstackContentTypes blog,report',
      'Build artifact from published Contentstack entries'
    )
    .example(
      '$0 --localContentPath ~/dev/security-labs-elastic-co/_content/articles',
      'Build artifact from local markdown content'
    )
    .example('$0 -v 2026.07.10-152831', 'Build artifact with a specific UTC timestamp version')
    .epilogue(
      'For local development, the script defaults to localhost:9200 with elastic/changeme credentials.'
    );
}

export function runScript() {
  yargs(process.argv.slice(2))
    .command('*', 'Build Security Labs knowledge base artifact', options, async (argv) => {
      const taskConfig: TaskConfig = {
        version: argv.artifactVersion,
        buildFolder: argv.buildFolder,
        targetFolder: argv.targetFolder,
        embeddingClusterUrl: argv.embeddingClusterUrl,
        embeddingClusterUsername: argv.embeddingClusterUsername,
        embeddingClusterPassword: argv.embeddingClusterPassword,
        contentstackHost: argv.contentstackHost,
        contentstackApiKey: argv.contentstackApiKey,
        contentstackDeliveryToken: argv.contentstackDeliveryToken,
        contentstackEnvironment: argv.contentstackEnvironment,
        contentstackLocale: argv.contentstackLocale,
        contentstackContentTypes: parseList(argv.contentstackContentTypes),
        localContentPath: argv.localContentPath,
        inferenceId: argv.inferenceId,
      };

      return buildArtifact(taskConfig);
    })
    .parse();
}
