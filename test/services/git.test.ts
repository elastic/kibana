import { addRemote } from '../../src/services/git';
import * as rpc from '../../src/services/rpc';

describe('addRemote', () => {
  it('add correct origin remote', async () => {
    const spy = jest.spyOn(rpc, 'exec').mockResolvedValue({} as any);
    await addRemote({
      accessToken: 'myAccessToken',
      owner: 'elastic',
      repoName: 'kibana',
      username: 'elastic'
    });

    return expect(spy).toHaveBeenCalledWith(
      'git remote add elastic https://myAccessToken@github.com/elastic/kibana.git',
      { cwd: '/myHomeDir/.backport/repositories/elastic/kibana' }
    );
  });

  it('add correct user remote', async () => {
    const spy = jest.spyOn(rpc, 'exec').mockResolvedValue({} as any);
    await addRemote({
      accessToken: 'myAccessToken',
      owner: 'elastic',
      repoName: 'kibana',
      username: 'sqren'
    });

    return expect(spy).toHaveBeenCalledWith(
      'git remote add sqren https://myAccessToken@github.com/sqren/kibana.git',
      { cwd: '/myHomeDir/.backport/repositories/elastic/kibana' }
    );
  });
});
