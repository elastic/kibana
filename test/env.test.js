const os = require('os');
const {
  getGlobalConfigPath,
  getReposPath,
  getRepoOwnerPath,
  getRepoPath
} = require('../src/lib/env');

describe('env.js', () => {
  beforeEach(() => {
    os.homedir = jest.fn(() => '/myHomeDir');
  });

  test('getGlobalConfigPath', () => {
    expect(getGlobalConfigPath()).toBe('/myHomeDir/.backport/config.json');
  });

  test('getReposPath', () => {
    expect(getReposPath()).toBe('/myHomeDir/.backport/repositories');
  });

  test('getRepoOwnerPath', () => {
    expect(getRepoOwnerPath('elastic')).toBe(
      '/myHomeDir/.backport/repositories/elastic'
    );
  });

  test('getRepoPath', () => {
    expect(getRepoPath('elastic', 'kibana')).toBe(
      '/myHomeDir/.backport/repositories/elastic/kibana'
    );
  });
});
