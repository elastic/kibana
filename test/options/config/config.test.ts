import { getOptionsFromConfigFiles } from '../../../src/options/config/config';
import { PromiseReturnType } from '../../../src/types/commons';
import * as rpc from '../../../src/services/rpc';

describe('getOptionsFromConfigFiles', () => {
  let res: PromiseReturnType<typeof getOptionsFromConfigFiles>;

  beforeEach(async () => {
    jest.spyOn(rpc, 'readFile').mockImplementation(async filepath => {
      switch (filepath) {
        // mock project config
        case '/path/to/project/config':
          return JSON.stringify({
            upstream: 'elastic/kibana',
            branches: ['6.x', '6.1']
          });

        // mock global config
        case '/myHomeDir/.backport/config.json':
          return JSON.stringify({
            username: 'sqren',
            accessToken: 'myAccessToken'
          });
        default:
          throw new Error(`Unknown filepath: "${filepath}"`);
      }
    });
    res = await getOptionsFromConfigFiles();
  });

  it('should return correct config', () => {
    expect(res).toEqual({
      accessToken: 'myAccessToken',
      all: false,
      branchChoices: [
        { checked: false, name: '6.x' },
        { checked: false, name: '6.1' }
      ],
      labels: [],
      multiple: false,
      multipleBranches: true,
      multipleCommits: false,
      prTitle: '[{baseBranch}] {commitMessages}',
      upstream: 'elastic/kibana',
      username: 'sqren'
    });
  });
});
