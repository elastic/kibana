/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Path from 'path';
import yargs, { type Argv } from 'yargs';
import { REPO_ROOT } from '@kbn/repo-info';
import { getSecurityLabsUtcTimestampVersion } from '@kbn/product-doc-common';
import { DEFAULT_ELSER } from './tasks/create_index';
import type { TaskConfig } from './types';
import { buildArtifact } from './build_artifact';

// Source of truth for Security Labs articles.
const SECURITY_LABS_REPO = 'https://github.com/elastic/security-labs-elastic-co';
const SECURITY_LABS_CONTENT_SUBPATH = '_content/articles';

function options(y: Argv) {
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
    .option('githubRepoUrl', {
      describe:
        'GitHub repository URL for Security Labs content (must be elastic/security-labs-elastic-co; use --localContentPath for forks)',
      string: true,
      default: process.env.SECURITY_LABS_REPO_URL ?? SECURITY_LABS_REPO,
    })
    .option('githubRef', {
      describe: 'Git ref (branch, tag, or commit) to fetch content from',
      string: true,
      default: process.env.SECURITY_LABS_REPO_REF ?? 'main',
    })
    .option('contentSubPath', {
      describe: 'Repository-relative path that holds the article markdown',
      string: true,
      default: process.env.SECURITY_LABS_CONTENT_SUBPATH ?? SECURITY_LABS_CONTENT_SUBPATH,
    })
    .option('githubToken', {
      describe: 'GitHub token for accessing the repository (required for internal repos)',
      string: true,
      default: process.env.GITHUB_TOKEN,
    })
    .option('localContentPath', {
      describe: 'Local path to Security Labs content (alternative to GitHub fetch)',
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
      '$0 --localContentPath ~/dev/security-labs-elastic-co/_content/articles',
      'Build artifact from local content'
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
        githubRepoUrl: argv.githubRepoUrl,
        githubRef: argv.githubRef,
        contentSubPath: argv.contentSubPath,
        githubToken: argv.githubToken,
        localContentPath: argv.localContentPath,
        inferenceId: argv.inferenceId,
      };

      return buildArtifact(taskConfig);
    })
    .parse();
}
