import del from 'del';
import { BackportOptions } from '../../../src/options/options';
import { maybeSetupRepo } from '../../../src/steps/maybeSetupRepo';
import makeDir = require('make-dir');

describe('maybeSetupRepo', () => {
  it('should delete repo if an error occurs', async () => {
    expect.assertions(2);
    ((makeDir as any) as jest.Mock).mockImplementationOnce(() => {
      throw new Error('makeDir failed');
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
      expect(e.message).toBe('makeDir failed');
      expect(del).toHaveBeenCalledWith(
        '/myHomeDir/.backport/repositories/elastic/kibana'
      );
    }
  });
});
