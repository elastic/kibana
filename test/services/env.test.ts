import {
  getGlobalConfigPath,
  getReposPath,
  getRepoOwnerPath,
  getRepoPath
} from '../../src/services/env';
import { BackportOptions } from '../../src/options/options';

describe('env.js', () => {
  test('getGlobalConfigPath', () => {
    expect(getGlobalConfigPath()).toBe('/myHomeDir/.backport/config.json');
  });

  test('getReposPath', () => {
    expect(getReposPath()).toBe('/myHomeDir/.backport/repositories');
  });

  test('getRepoOwnerPath', () => {
    expect(getRepoOwnerPath({ repoOwner: 'elastic' } as BackportOptions)).toBe(
      '/myHomeDir/.backport/repositories/elastic'
    );
  });

  test('getRepoPath', () => {
    expect(
      getRepoPath({
        repoOwner: 'elastic',
        repoName: 'kibana'
      } as BackportOptions)
    ).toBe('/myHomeDir/.backport/repositories/elastic/kibana');
  });
});
