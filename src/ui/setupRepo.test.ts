import os from 'os';
import del from 'del';
import { Commit } from '../entrypoint.module';
import { ValidConfigOptions } from '../options/options';
import * as childProcess from '../services/child-process-promisified';
import * as gitModule from '../services/git';
import { getOraMock } from '../test/mocks';
import { setupRepo } from './setupRepo';

describe('setupRepo', () => {
  let execSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.spyOn(os, 'homedir').mockReturnValue('/myHomeDir');

    execSpy = jest
      .spyOn(childProcess, 'exec')
      .mockResolvedValue({ stderr: '', stdout: '' });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('if an error occurs while cloning', () => {
    it('should delete repo', async () => {
      expect.assertions(2);

      execSpy = jest
        .spyOn(childProcess, 'execAsCallback')
        .mockImplementation((cmd) => {
          if (cmd.startsWith('git clone')) {
            throw new Error('Simulated git clone failure');
          }

          throw new Error('unknown error');
        });

      await expect(
        setupRepo(
          {
            repoName: 'kibana',
            repoOwner: 'elastic',
            cwd: '/path/to/source/repo',
          } as ValidConfigOptions,
          [getMockCommit()]
        )
      ).rejects.toThrowError('Simulated git clone failure');

      expect(del).toHaveBeenCalledWith(
        '/myHomeDir/.backport/repositories/elastic/kibana',
        { force: true }
      );
    });
  });

  describe('while cloning the repo', () => {
    it('updates the progress', async () => {
      let onCloneComplete: () => void;
      let dataHandler: (chunk: any) => void;

      const oraMock = getOraMock();
      const spinnerTextSpy = jest.spyOn(oraMock, 'text', 'set');
      const spinnerSuccessSpy = jest.spyOn(oraMock, 'succeed');

      jest.spyOn(gitModule, 'getLocalRepoPath').mockResolvedValue(undefined);

      jest
        .spyOn(childProcess, 'execAsCallback')
        //@ts-expect-error
        .mockImplementation((cmdString, cmdOptions, onComplete) => {
          // callback should be called to finalize the operation
          if (onComplete) {
            //@ts-expect-error
            onCloneComplete = onComplete;
          }

          return {
            stderr: {
              on: (name, handler) => {
                dataHandler = handler;
              },
            },
          };
        });

      setTimeout(() => {
        dataHandler('Receiving objects:   1%');
        dataHandler('Receiving objects:   10%');
        dataHandler('Receiving objects:   20%');
        dataHandler('Receiving objects:   100%');
        dataHandler('Updating files:   1%');
        dataHandler('Updating files:   10%');
        dataHandler('Updating files:   20%');
        dataHandler('Updating files:   100%');
        onCloneComplete();
      }, 50);

      await setupRepo(
        {
          repoName: 'kibana',
          repoOwner: 'elastic',
          gitUserEmail: 'my-email',
          gitUserName: 'my-username',
          gitHostname: 'github.com',
          cwd: '/path/to/source/repo',
        } as ValidConfigOptions,
        [getMockCommit()]
      );

      expect(spinnerTextSpy.mock.calls.map((call) => call[0]))
        .toMatchInlineSnapshot(`
        Array [
          "0% Cloning repository from github.com (one-time operation)",
          "1% Cloning repository from github.com (one-time operation)",
          "9% Cloning repository from github.com (one-time operation)",
          "18% Cloning repository from github.com (one-time operation)",
          "90% Cloning repository from github.com (one-time operation)",
          "90% Cloning repository from github.com (one-time operation)",
          "91% Cloning repository from github.com (one-time operation)",
          "92% Cloning repository from github.com (one-time operation)",
          "100% Cloning repository from github.com (one-time operation)",
        ]
      `);

      expect(spinnerSuccessSpy).toHaveBeenCalledWith(
        '100% Cloning repository from github.com (one-time operation)'
      );
    });
  });

  describe('if repo already exists', () => {
    beforeEach(() => {
      jest
        .spyOn(childProcess, 'execAsCallback')
        //@ts-expect-error
        .mockImplementation((cmdString, cmdOptions, callback) => {
          //@ts-expect-error
          callback();

          return { stderr: { on: () => null } };
        });
    });

    it('should re-create remotes for both source repo and fork', async () => {
      await setupRepo(
        {
          accessToken: 'myAccessToken',
          authenticatedUsername: 'sqren_authenticated',
          repoName: 'kibana',
          repoOwner: 'elastic',
          gitUserEmail: 'my-email',
          gitUserName: 'my-username',
          cwd: '/path/to/source/repo',
        } as ValidConfigOptions,
        [getMockCommit()]
      );

      expect(
        execSpy.mock.calls.map(([cmd, { cwd }]) => ({ cmd, cwd }))
      ).toEqual([
        {
          cmd: 'git rev-parse --show-toplevel',
          cwd: '/myHomeDir/.backport/repositories/elastic/kibana',
        },
        { cmd: 'git remote --verbose', cwd: '/path/to/source/repo' },
        {
          cmd: 'git config user.name',
          cwd: '/myHomeDir/.backport/repositories/elastic/kibana',
        },
        {
          cmd: 'git config user.email',
          cwd: '/myHomeDir/.backport/repositories/elastic/kibana',
        },
        { cmd: 'git remote --verbose', cwd: '/path/to/source/repo' },
        {
          cmd: 'git config user.name my-username',
          cwd: '/myHomeDir/.backport/repositories/elastic/kibana',
        },
        {
          cmd: 'git config user.email my-email',
          cwd: '/myHomeDir/.backport/repositories/elastic/kibana',
        },
        {
          cmd: 'git remote rm origin',
          cwd: '/myHomeDir/.backport/repositories/elastic/kibana',
        },
        {
          cmd: 'git remote rm sqren_authenticated',
          cwd: '/myHomeDir/.backport/repositories/elastic/kibana',
        },
        {
          cmd: 'git remote add sqren_authenticated https://x-access-token:myAccessToken@github.com/sqren_authenticated/kibana.git',
          cwd: '/myHomeDir/.backport/repositories/elastic/kibana',
        },
        {
          cmd: 'git remote rm elastic',
          cwd: '/myHomeDir/.backport/repositories/elastic/kibana',
        },
        {
          cmd: 'git remote add elastic https://x-access-token:myAccessToken@github.com/elastic/kibana.git',
          cwd: '/myHomeDir/.backport/repositories/elastic/kibana',
        },
      ]);
    });
  });

  describe('if repo does not exists locally', () => {
    let spinnerSuccessSpy: jest.SpyInstance;
    beforeEach(async () => {
      const oraMock = getOraMock();
      spinnerSuccessSpy = jest.spyOn(oraMock, 'succeed');

      jest
        .spyOn(childProcess, 'execAsCallback')
        //@ts-expect-error
        .mockImplementation((cmdString, cmdOptions, callback) => {
          //@ts-expect-error
          callback();

          return { stderr: { on: () => null } };
        });

      await setupRepo(
        {
          accessToken: 'myAccessToken',
          gitUserEmail: 'my-email',
          gitUserName: 'my-username',
          gitHostname: 'github.com',
          repoName: 'kibana',
          repoOwner: 'elastic',
          cwd: '/path/to/source/repo',
        } as ValidConfigOptions,
        [getMockCommit()]
      );
    });

    it('should clone it from github.com', async () => {
      expect(spinnerSuccessSpy).toHaveBeenCalledWith(
        '100% Cloning repository from github.com (one-time operation)'
      );

      expect(childProcess.execAsCallback).toHaveBeenCalledWith(
        'git clone https://x-access-token:myAccessToken@github.com/elastic/kibana.git /myHomeDir/.backport/repositories/elastic/kibana --progress',
        expect.any(Object),
        expect.any(Function)
      );
    });
  });

  describe('if repo exists locally', () => {
    let spinnerSuccessSpy: jest.SpyInstance;
    beforeEach(async () => {
      const oraMock = getOraMock();
      spinnerSuccessSpy = jest.spyOn(oraMock, 'succeed');

      jest
        .spyOn(gitModule, 'getLocalRepoPath')
        .mockResolvedValue('/path/to/source/repo');

      jest
        .spyOn(gitModule, 'getGitConfig')
        .mockResolvedValue('email-or-username');

      jest
        .spyOn(childProcess, 'execAsCallback')
        //@ts-expect-error
        .mockImplementation((cmdString, cmdOptions, callback) => {
          //@ts-expect-error
          callback();

          return { stderr: { on: () => null } };
        });

      await setupRepo(
        {
          repoName: 'kibana',
          repoOwner: 'elastic',
          cwd: '/path/to/source/repo',
        } as ValidConfigOptions,
        [getMockCommit()]
      );
    });

    it('should clone it from local folder', async () => {
      expect(spinnerSuccessSpy).toHaveBeenCalledWith(
        '100% Cloning repository from /path/to/source/repo (one-time operation)'
      );

      expect(childProcess.execAsCallback).toHaveBeenCalledWith(
        'git clone /path/to/source/repo /myHomeDir/.backport/repositories/elastic/kibana --progress',
        expect.any(Object),
        expect.any(Function)
      );
    });
  });

  describe('if `repoPath` is a parent of current working directory (cwd)', () => {
    it('should clone it from local folder', async () => {
      await expect(() =>
        setupRepo(
          {
            repoName: 'kibana',
            repoOwner: 'elastic',
            cwd: '/myHomeDir/.backport/repositories/owner/repo/foo',
            dir: '/myHomeDir/.backport/repositories/owner/repo',
          } as ValidConfigOptions,
          [getMockCommit()]
        )
      ).rejects.toThrowError(
        'Refusing to clone repo into "/myHomeDir/.backport/repositories/owner/repo" when current working directory is "/myHomeDir/.backport/repositories/owner/repo/foo". Please change backport directory via `--dir` option or run backport from another location'
      );
    });
  });
});

function getMockCommit(): Commit {
  return {
    author: { email: 'sorenlouv@gmail.com', name: 'Søren Louv-Jansen' },
    sourceCommit: {
      committedDate: '2020-08-15T10:44:04Z',
      message: 'Add family emoji (#2)',
      sha: '59d6ff1ca90a4ce210c0a4f0e159214875c19d60',
    },
    sourcePullRequest: {
      number: 2,
      url: 'https://github.com/backport-org/backport-e2e/pull/2',
      mergeCommit: {
        message: 'Add family emoji (#2)',
        sha: '59d6ff1ca90a4ce210c0a4f0e159214875c19d60',
      },
    },
    sourceBranch: 'master',
    expectedTargetPullRequests: [
      {
        branch: '7.x',
        number: 4,
        state: 'MERGED',
        url: 'https://github.com/backport-org/backport-e2e/pull/4',
        mergeCommit: {
          message: 'Add family emoji (#2) (#4)',
          sha: 'f8b4f6ae7ffaf2732fa5e33e98b3ea772bdfff1d',
        },
      },
    ],
  };
}
