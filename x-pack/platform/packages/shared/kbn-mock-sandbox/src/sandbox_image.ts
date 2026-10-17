/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import type { ToolingLog } from '@kbn/tooling-log';
import type { DockerCli } from './docker_cli';

// A light stand-in for Dockerfile.sandbox in elastic/sandbox-service: same user, workspace and
// venv layout, and the CLI tools Kibana's sandbox tools rely on (bash, curl, jq, rg, git, python).
const DOCKERFILE = `
FROM ubuntu:24.04
RUN apt-get update && apt-get install -y --no-install-recommends \\
    bash ca-certificates coreutils curl fd-find git gzip jq less python3 python3-venv \\
    ripgrep tree unzip wget \\
  && rm -rf /var/lib/apt/lists/*
RUN groupadd -g 10000 appuser && useradd -u 10000 -g appuser -s /bin/bash -m appuser \\
  && mkdir -p /workspace && chown appuser:appuser /workspace
USER appuser
ENV HOME=/home/appuser
RUN python3 -m venv /home/appuser/.venv \\
  && /home/appuser/.venv/bin/pip install --no-cache-dir requests numpy pandas tabulate
ENV PATH="/home/appuser/.venv/bin:/home/appuser/.local/bin:$PATH"
WORKDIR /workspace
CMD ["sleep", "infinity"]
`;

const IMAGE_REPOSITORY = 'kbn-mock-sandbox';

/** Default image tag; changes whenever the Dockerfile changes so stale images are rebuilt. */
export const DEFAULT_IMAGE = `${IMAGE_REPOSITORY}:${createHash('sha256')
  .update(DOCKERFILE)
  .digest('hex')
  .slice(0, 12)}`;

/** Builds the default mock sandbox image unless it already exists locally. */
export const ensureDefaultImage = async (docker: DockerCli, log: ToolingLog): Promise<string> => {
  const inspect = await docker.run(['image', 'inspect', DEFAULT_IMAGE]);
  if (inspect.exitCode === 0) {
    log.debug(`Using existing image ${DEFAULT_IMAGE}`);
    return DEFAULT_IMAGE;
  }
  log.info(`Building ${DEFAULT_IMAGE} (one-time, takes 1-2 minutes)...`);
  const exitCode = await docker.runInteractive(['build', '-t', DEFAULT_IMAGE, '-'], DOCKERFILE);
  if (exitCode !== 0) {
    throw new Error(`docker build of ${DEFAULT_IMAGE} failed with exit code ${exitCode}`);
  }
  return DEFAULT_IMAGE;
};

/** Checks that a user-supplied image exists locally, pulling it if needed. */
export const ensureCustomImage = async (
  docker: DockerCli,
  log: ToolingLog,
  image: string
): Promise<string> => {
  const inspect = await docker.run(['image', 'inspect', image]);
  if (inspect.exitCode === 0) {
    return image;
  }
  log.info(`Pulling ${image}...`);
  const exitCode = await docker.runInteractive(['pull', image]);
  if (exitCode !== 0) {
    throw new Error(`Image ${image} is not available locally and could not be pulled`);
  }
  return image;
};
