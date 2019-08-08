import { PromiseReturnType } from '../../../../src/types/commons';
import { getOptionsFromConfigFiles } from '../../../../src/options/config/config';

describe('getOptionsFromConfigFiles', () => {
  let res: PromiseReturnType<typeof getOptionsFromConfigFiles>;

  beforeEach(async () => {
    res = await getOptionsFromConfigFiles();
  });

  it('should return correct config', () => {
    expect(res).toEqual({
      accessToken: 'myAccessToken',
      all: false,
      apiHostname: 'api.github.com',
      branchChoices: [
        { checked: false, name: '6.0' },
        { checked: false, name: '5.9' }
      ],
      fork: true,
      gitHostname: 'github.com',
      labels: [],
      multiple: false,
      multipleBranches: true,
      multipleCommits: false,
      prTitle: '[{baseBranch}] {commitMessages}',
      upstream: 'elastic/backport-demo',
      username: 'sqren'
    });
  });
});
