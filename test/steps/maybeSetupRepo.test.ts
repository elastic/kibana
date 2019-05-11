import rimraf from 'rimraf';
import * as rpc from '../../src/services/rpc';
import { maybeSetupRepo } from '../../src/steps/maybeSetupRepo';
import { BackportOptions } from '../../src/options/options';

describe('maybeSetupRepo', () => {
  it('should delete repo if an error occurs', async () => {
    expect.assertions(1);
    jest.spyOn(rpc, 'mkdirp').mockImplementationOnce(() => {
      throw new Error();
    });

    try {
      await maybeSetupRepo({
        repoOwner: 'elastic',
        repoName: 'kibana',
        username: 'sqren',
        accessToken: 'myAccessToken',
        gitHostname: 'github.com'
      } as BackportOptions);
    } catch (e) {
      expect(rimraf).toHaveBeenCalledWith(
        '/myHomeDir/.backport/repositories/elastic/kibana',
        expect.any(Function)
      );
    }
  });
});
