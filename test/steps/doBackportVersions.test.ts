import axios from 'axios';
import * as childProcess from 'child_process';
import {
  doBackportVersion,
  getReferenceLong
} from '../../src/steps/doBackportVersions';
import { PromiseReturnType } from '../../src/types/commons';
import last from 'lodash.last';
import * as prompts from '../../src/services/prompts';
import * as logger from '../../src/services/logger';

describe('doBackportVersion', () => {
  let axiosMockInstance: jest.Mock;

  beforeEach(() => {
    axiosMockInstance = jest
      .spyOn(axios, 'post')
      // mock: createPullRequest
      // @ts-ignore
      .mockResolvedValueOnce({
        data: {
          number: 1337,
          html_url: 'myHtmlUrl'
        }
      })
      // mock: addLabelsToPullRequest
      .mockResolvedValueOnce(null);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when commit has a pull request reference', () => {
    let execSpy: jest.SpyInstance;
    let res: PromiseReturnType<typeof doBackportVersion>;
    beforeEach(async () => {
      const commits = [
        {
          sha: 'mySha',
          message: 'myCommitMessage',
          pullNumber: 1000
        },
        {
          sha: 'mySha2',
          message: 'myOtherCommitMessage',
          pullNumber: 2000
        }
      ];

      execSpy = jest.spyOn(childProcess, 'exec');

      res = await doBackportVersion(
        'elastic',
        'kibana',
        commits,
        '6.x',
        'sqren',
        ['backport'],
        '[{baseBranch}] {commitMessages}',
        'myPrSuffix',
        'api.github.com'
      );
    });

    it('should make correct git commands', () => {
      expect(execSpy.mock.calls).toMatchSnapshot();
    });

    it('should return correct response', () => {
      expect(res).toEqual({ html_url: 'myHtmlUrl', number: 1337 });
    });

    it('should create pull request and add labels', () => {
      expect(axiosMockInstance).toHaveBeenCalledTimes(2);
      expect(axiosMockInstance).toHaveBeenNthCalledWith(
        1,
        'https://api.github.com/repos/elastic/kibana/pulls?access_token=undefined',
        {
          title: '[6.x] myCommitMessage | myOtherCommitMessage',
          body:
            'Backports the following commits to 6.x:\n - myCommitMessage (#1000)\n - myOtherCommitMessage (#2000)\n\nmyPrSuffix',
          head: 'sqren:backport/6.x/pr-1000_pr-2000',
          base: '6.x'
        }
      );

      expect(axiosMockInstance).toHaveBeenNthCalledWith(
        2,
        'https://api.github.com/repos/elastic/kibana/issues/1337/labels?access_token=undefined',
        ['backport']
      );
    });
  });

  describe('when commit does not have a pull request reference', () => {
    beforeEach(async () => {
      const commits = [
        {
          sha: 'mySha',
          message: 'myCommitMessage'
        }
      ];

      await doBackportVersion(
        'elastic',
        'kibana',
        commits,
        '6.x',
        'sqren',
        ['backport'],
        '[{baseBranch}] {commitMessages}',
        undefined,
        'api.github.com'
      );
    });

    it('should create pull request and add labels', () => {
      expect(axiosMockInstance).toHaveBeenCalledTimes(2);
      expect(axiosMockInstance).toHaveBeenNthCalledWith(
        1,
        'https://api.github.com/repos/elastic/kibana/pulls?access_token=undefined',
        {
          title: '[6.x] myCommitMessage',
          body:
            'Backports the following commits to 6.x:\n - myCommitMessage (mySha)',
          head: 'sqren:backport/6.x/commit-mySha',
          base: '6.x'
        }
      );

      expect(axiosMockInstance).toHaveBeenNthCalledWith(
        2,
        'https://api.github.com/repos/elastic/kibana/issues/1337/labels?access_token=undefined',
        ['backport']
      );
    });
  });

  describe('when cherry-picking fails', () => {
    function didResolveConflict(didResolve: boolean) {
      const logSpy = jest.spyOn(logger, 'log');
      const commits = [
        {
          sha: 'mySha',
          message: 'myCommitMessage'
        }
      ];

      const execSpy = jest
        .spyOn(childProcess, 'exec')
        .mockImplementation((...args: any[]) => {
          const [cmd] = args;
          if (cmd.includes('git cherry-pick')) {
            const e = new Error('as');
            // @ts-ignore
            e.cmd = cmd;
            throw e;
          } else {
            last(args)();
          }

          return {} as any;
        });

      spyOn(prompts, 'confirmPrompt').and.returnValue(didResolve);

      const promise = doBackportVersion(
        'elastic',
        'kibana',
        commits,
        '6.x',
        'sqren',
        ['backport'],
        'myPrTitle',
        undefined,
        'api.github.com'
      );

      return { logSpy, execSpy, promise };
    }

    it('and conflicts were resolved', async () => {
      const { execSpy, promise } = didResolveConflict(true);
      await promise;
      expect(execSpy.mock.calls).toMatchSnapshot();
      expect(axiosMockInstance).toHaveBeenCalledTimes(2);
    });

    it('and conflicts were not resolved', async () => {
      const { execSpy, promise, logSpy } = didResolveConflict(false);
      expect.assertions(4);

      await promise.catch(e => {
        expect(logSpy.mock.calls).toMatchInlineSnapshot(`
          Array [
            Array [
              "Backporting mySha to 6.x:",
            ],
            Array [
              "Please resolve conflicts in: /myHomeDir/.backport/repositories/elastic/kibana and when all conflicts have been resolved and staged run:",
            ],
            Array [
              "
              git cherry-pick --continue
              ",
            ],
          ]
        `);
        expect(e.message).toEqual('Aborted');
        expect(execSpy.mock.calls).toMatchSnapshot();
        expect(axiosMockInstance).toHaveBeenCalledTimes(0);
      });
    });
  });
});

describe('getReferenceLong', () => {
  it('should return a sha', () => {
    expect(
      getReferenceLong({ sha: 'mySha1234567', message: 'myMessage' })
    ).toEqual('mySha12');
  });

  it('should return a pr', () => {
    expect(
      getReferenceLong({
        pullNumber: 1337,
        sha: 'mySha1234567',
        message: 'myMessage'
      })
    ).toEqual('#1337');
  });
});
