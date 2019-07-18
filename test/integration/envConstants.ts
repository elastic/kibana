import { resolve } from 'path';

// paths
export const INTEGRATION_TEST_DATA_PATH = resolve(
  './test/integration/mock-environment'
);
export const HOMEDIR_PATH = resolve(
  './test/integration/mock-environment/homedir'
);
export const REMOTE_ORIGIN_REPO_PATH = resolve(
  './test/integration/mock-environment/github.com/elastic/backport-demo/.git'
);
export const REMOTE_FORK_REPO_PATH = resolve(
  './test/integration/mock-environment/github.com/sqren/backport-demo/.git'
);
