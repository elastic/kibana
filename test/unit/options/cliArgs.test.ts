import { getOptionsFromCliArgs } from '../../../src/options/cliArgs';

describe('getOptionsFromCliArgs', () => {
  let res: ReturnType<typeof getOptionsFromCliArgs>;

  beforeEach(async () => {
    const configOptions = {
      accessToken: 'myAccessToken',
      all: false,
      apiHostname: 'api.github.com',
      branchChoices: [],
      gitHostname: 'github.com',
      labels: [],
      multiple: false,
      multipleBranches: true,
      multipleCommits: false,
      prTitle: 'myPrTitle',
      upstream: 'elastic/kibana',
      username: 'sqren'
    };

    const argv = [
      '--branch',
      '6.0',
      '--branch',
      '6.1',
      '--upstream',
      'sqren/backport-demo',
      '--all',
      '--username',
      'sqren'
    ];

    res = getOptionsFromCliArgs(configOptions, argv);
  });

  it('should return correct options', () => {
    expect(res).toEqual({
      accessToken: 'myAccessToken',
      all: true,
      apiHostname: 'api.github.com',
      branches: ['6.0', '6.1'],
      branchChoices: [],
      gitHostname: 'github.com',
      labels: [],
      multiple: false,
      multipleBranches: true,
      multipleCommits: false,
      prTitle: 'myPrTitle',
      sha: undefined,
      upstream: 'sqren/backport-demo',
      username: 'sqren'
    });
  });
});
