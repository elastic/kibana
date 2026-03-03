/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Path from 'path';
import yargs from 'yargs';
import { REPO_ROOT } from '@kbn/repo-info';
import type { TaskConfig } from './types';
import { buildArtifact } from './build_artifact';

// Stub for Security Labs GitHub repo - to be replaced with actual repo URL
const SECURITY_LABS_REPO = 'https://github.com/elastic/security-labs-content';

// Generate today's date as default version (YYYY.MM.DD)
const getTodayVersion = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}.${month}.${day}`;
};

function options(y: yargs.Argv) {
  return y
    .version(false) // Disable built-in version flag to avoid conflict
    .option('artifactVersion', {
      alias: 'v',
      describe: 'The date-based version for the artifact (YYYY.MM.DD format). Defaults to today.',
      string: true,
      default: process.env.SECURITY_LABS_VERSION ?? getTodayVersion(),
    })
    .option('targetFolder', {
      describe: 'The folder to generate the artifact in',
      string: true,
      default: Path.join(REPO_ROOT, 'build', 'security-labs-artifacts'),
    })
    .option('buildFolder', {
      describe: 'The folder to use for temporary files',
      string: true,
      default: Path.join(REPO_ROOT, 'build', 'temp-security-labs-artifacts'),
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
      describe: 'GitHub repository URL for Security Labs content',
      string: true,
      default: process.env.SECURITY_LABS_REPO_URL ?? SECURITY_LABS_REPO,
    })
    .option('githubToken', {
      describe: 'GitHub token for accessing the repository',
      string: true,
      default: process.env.GITHUB_TOKEN,
    })
    .option('localContentPath', {
      describe: 'Local path to Security Labs content (alternative to GitHub fetch)',
      string: true,
      // Check for common local paths
      default: process.env.SECURITY_LABS_CONTENT_PATH,
    })
    .locale('en')
    .example(
      '$0 --localContentPath ~/dev/security-labs-elastic-co/_content/articles',
      'Build artifact from local content'
    )
    .example('$0 -v 2024.12.11', 'Build artifact with specific version')
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
        githubToken: argv.githubToken,
        localContentPath: argv.localContentPath,
      };

      return buildArtifact(taskConfig);
    })
    .parse();
}
