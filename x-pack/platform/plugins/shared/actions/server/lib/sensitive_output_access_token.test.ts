/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { execFileSync } from 'child_process';
import { REPO_ROOT } from '@kbn/repo-info';

/**
 * Repository-wide static-usage guard for the `sensitiveOutput` capability token.
 *
 * This is a repository POLICY check, not a runtime security boundary: it only
 * detects a second, textually-matchable reference to the token or its accessor
 * method appearing in this repository's own source at the time this test runs. It
 * cannot prevent another plugin from declaring `actions` as a dependency and
 * calling `getSensitiveOutputAccessToken()` in a way that evades a plain-text
 * search (e.g. dynamic property access), and it says nothing about what a caller
 * does with the token once obtained. See `sensitive_output_access_token.ts` for
 * the full framing.
 */

// Files/directories permitted to reference the token or its accessor: the actions
// plugin itself (where the token is created, compared, and exposed), and the
// designated `connector_provisioning` plugin (the intended, statically-checked
// direct caller -- see the connector-provisioning plan's §5.2/§5.3).
const ALLOWED_PATHS = [
  'x-pack/platform/plugins/shared/actions/server/lib/sensitive_output_access_token.ts',
  'x-pack/platform/plugins/shared/actions/server/lib/sensitive_output_access_token.test.ts',
  'x-pack/platform/plugins/shared/actions/server/lib/action_executor.ts',
  'x-pack/platform/plugins/shared/actions/server/lib/action_executor.test.ts',
  'x-pack/platform/plugins/shared/actions/server/plugin.ts',
  'x-pack/platform/plugins/shared/connector_provisioning/',
];

const isAllowed = (file: string): boolean =>
  ALLOWED_PATHS.some((allowed) => file === allowed || file.startsWith(allowed));

const gitGrepFiles = (pattern: string): string[] => {
  try {
    const output = execFileSync(
      'git',
      ['grep', '--fixed-strings', '-l', pattern, '--', '*.ts', '*.tsx'],
      { cwd: REPO_ROOT, encoding: 'utf8' }
    );
    return output.split('\n').filter(Boolean);
  } catch (error) {
    // `git grep` exits with status 1 (not an error) when there are zero matches.
    if ((error as { status?: number }).status === 1) {
      return [];
    }
    throw error;
  }
};

describe('sensitiveOutput capability token usage guard', () => {
  it('SENSITIVE_OUTPUT_ACCESS_TOKEN is only referenced inside the actions plugin', () => {
    const files = gitGrepFiles('SENSITIVE_OUTPUT_ACCESS_TOKEN');
    const unexpected = files.filter((file) => !isAllowed(file));
    expect(unexpected).toEqual([]);
  });

  it('getSensitiveOutputAccessToken( is only called from the actions plugin or connector_provisioning', () => {
    const files = gitGrepFiles('getSensitiveOutputAccessToken(');
    const unexpected = files.filter((file) => !isAllowed(file));
    expect(unexpected).toEqual([]);
  });
});
