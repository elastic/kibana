const { verifyGithubSshAuth } = require('../src/lib/git');
const rpc = require('../src/lib/rpc');

describe('verifyGithubSshAuth', () => {
  it('github.com is not added to known_hosts file', () => {
    const err = new Error();
    err.code = 255;
    err.stderr = 'Host key verification failed.\r\n';
    rpc.exec = jest.fn().mockReturnValue(Promise.reject(err));

    return expect(verifyGithubSshAuth()).rejects.toThrow(
      'Host verification of github.com failed. To automatically add it to .ssh/known_hosts run:'
    );
  });

  it('ssh key rejected', async () => {
    const err = new Error();
    err.code = 255;
    err.stderr = 'git@github.com: Permission denied (publickey).\r\n';
    rpc.exec = jest.fn().mockReturnValue(Promise.reject(err));

    return expect(verifyGithubSshAuth()).rejects.toThrowError(
      'Permission denied. Please add your ssh private key to the keychain by following these steps:'
    );
  });

  it('user is successfully authenticated', async () => {
    const err = new Error();
    err.code = 1;
    err.stderr =
      "Hi sqren! You've successfully authenticated, but GitHub does not provide shell access.\n";
    rpc.exec = jest.fn().mockReturnValue(Promise.reject(err));

    return expect(verifyGithubSshAuth()).resolves.toBe(true);
  });
});
