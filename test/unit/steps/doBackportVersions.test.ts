import axios from 'axios';
import * as logger from '../../../src/services/logger';
import * as prompts from '../../../src/services/prompts';
import { BackportOptions } from '../../../src/options/options';
import { doBackportVersion } from '../../../src/steps/doBackportVersions';
import { exec } from '../../../src/services/child-process-promisified';

describe('doBackportVersion', () => {
  let axiosPostMock: jest.SpyInstance;

  beforeEach(() => {
    axiosPostMock = jest
      .spyOn(axios, 'post')

      // mock: createPullRequest
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
    beforeEach(async () => {
      execSpy = (exec as any) as jest.SpyInstance;

      await doBackportVersion(
        {
          repoOwner: 'elastic',
          repoName: 'kibana',
          username: 'sqren',
          labels: ['backport'],
          prTitle: '[{baseBranch}] {commitMessages}',
          prDescription: 'myPrSuffix',
          apiHostname: 'api.github.com'
        } as BackportOptions,
        {
          commits: [
            {
              sha: 'mySha',
              message: 'myCommitMessage (#1000)',
              pullNumber: 1000
            },
            {
              sha: 'mySha2',
              message: 'myOtherCommitMessage (#2000)',
              pullNumber: 2000
            }
          ],
          baseBranch: '6.x'
        }
      );
    });

    it('should make correct git commands', () => {
      expect(execSpy.mock.calls).toMatchSnapshot();
    });

    it('should create pull request', () => {
      expect(axiosPostMock).toHaveBeenCalledTimes(2);
      const [apiEndpoint, payload] = axiosPostMock.mock.calls[0];
      expect(apiEndpoint).toBe(
        'https://api.github.com/repos/elastic/kibana/pulls?access_token=undefined'
      );
      expect(payload.title).toBe(
        '[6.x] myCommitMessage (#1000) | myOtherCommitMessage (#2000)'
      );
      expect(payload.body).toBe(
        `Backports the following commits to 6.x:
 - myCommitMessage (#1000)
 - myOtherCommitMessage (#2000)

myPrSuffix`
      );
      expect(payload.head).toBe('sqren:backport/6.x/pr-1000_pr-2000');
      expect(payload.base).toBe('6.x');
    });

    it('it should add labels', () => {
      const [apiEndpoint, labels] = axiosPostMock.mock.calls[1];

      expect(apiEndpoint).toBe(
        'https://api.github.com/repos/elastic/kibana/issues/1337/labels?access_token=undefined'
      );
      expect(labels).toEqual(['backport']);
    });
  });

  describe('when commit does not have a pull request reference', () => {
    beforeEach(async () => {
      await doBackportVersion(
        {
          repoOwner: 'elastic',
          repoName: 'kibana',
          username: 'sqren',
          labels: ['backport'],
          prTitle: '[{baseBranch}] {commitMessages}',
          apiHostname: 'api.github.com'
        } as BackportOptions,
        {
          commits: [{ sha: 'mySha', message: 'myCommitMessage (mySha)' }],
          baseBranch: '6.x'
        }
      );
    });

    it('should create pull request', () => {
      expect(axiosPostMock).toHaveBeenCalledTimes(2);
      const [apiEndpoint, payload] = axiosPostMock.mock.calls[0];
      expect(apiEndpoint).toBe(
        'https://api.github.com/repos/elastic/kibana/pulls?access_token=undefined'
      );
      expect(payload.title).toBe('[6.x] myCommitMessage (mySha)');
      expect(payload.body).toBe(
        `Backports the following commits to 6.x:
 - myCommitMessage (mySha)`
      );
      expect(payload.head).toBe('sqren:backport/6.x/commit-mySha');
      expect(payload.base).toBe('6.x');
    });

    it('it should add labels', () => {
      const [apiEndpoint, labels] = axiosPostMock.mock.calls[1];

      expect(apiEndpoint).toBe(
        'https://api.github.com/repos/elastic/kibana/issues/1337/labels?access_token=undefined'
      );
      expect(labels).toEqual(['backport']);
    });
  });

  describe('when cherry-picking fails', () => {
    function didResolveConflict(didResolve: boolean) {
      const logSpy = jest.spyOn(logger, 'log');

      const execSpy = ((exec as any) as jest.SpyInstance).mockImplementation(
        async (cmd: string) => {
          if (cmd.includes('git cherry-pick')) {
            const e = new Error('cherry pick error');
            // @ts-ignore
            e.cmd = cmd;
            throw e;
          }

          return 'exec suceeded';
        }
      );

      spyOn(prompts, 'confirmPrompt').and.returnValue(didResolve);

      const promise = doBackportVersion(
        {
          repoOwner: 'elastic',
          repoName: 'kibana',
          username: 'sqren',
          labels: ['backport'],
          prTitle: '[{baseBranch}] {commitMessages}',
          apiHostname: 'api.github.com'
        } as BackportOptions,
        {
          commits: [{ sha: 'mySha', message: 'myCommitMessage' }],
          baseBranch: '6.x'
        }
      );

      return { logSpy, execSpy, promise };
    }

    it('and conflicts were resolved', async () => {
      const { execSpy, promise } = didResolveConflict(true);
      await promise;
      expect(execSpy.mock.calls).toMatchSnapshot();
      expect(axiosPostMock).toHaveBeenCalledTimes(2);
    });

    it('and conflicts were not resolved', async () => {
      const { execSpy, promise, logSpy } = didResolveConflict(false);
      expect.assertions(4);

      await promise.catch(e => {
        expect(logSpy.mock.calls).toMatchInlineSnapshot(`
          Array [
            Array [
              "
          [1mBackporting the following commits to 6.x:[22m
           - myCommitMessage
          ",
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
        expect(axiosPostMock).toHaveBeenCalledTimes(0);
      });
    });
  });
});
