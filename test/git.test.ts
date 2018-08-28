import { verifyGithubSshAuth } from '../src/lib/git';
import * as rpc from '../src/lib/rpc';

export class CustomError extends Error {
  public code: number;
  public stderr: string;
  constructor(code: number, stderr: string) {
    super();
    this.code = code;
    this.stderr = stderr;
  }
}

describe('verifyGithubSshAuth', () => {
  it('github.com is not added to known_hosts file', () => {
    const err = new CustomError(255, 'Host key verification failed.\r\n');
    jest.spyOn(rpc, 'exec').mockRejectedValue(err);

    return expect(verifyGithubSshAuth()).rejects.toThrow(
      'Host verification of github.com failed. To automatically add it to .ssh/known_hosts run:'
    );
  });

  it('ssh key rejected', async () => {
    const err = new CustomError(
      255,
      'git@github.com: Permission denied (publickey).\r\n'
    );

    jest.spyOn(rpc, 'exec').mockRejectedValue(err);

    return expect(verifyGithubSshAuth()).rejects.toThrowError(
      'Permission denied. Please add your ssh private key to the keychain by following these steps:'
    );
  });

  it('user is successfully authenticated', async () => {
    const err = new CustomError(
      1,
      "Hi sqren! You've successfully authenticated, but GitHub does not provide shell access.\n"
    );
    jest.spyOn(rpc, 'exec').mockRejectedValue(err);

    return expect(verifyGithubSshAuth()).resolves.toBe(true);
  });
});
