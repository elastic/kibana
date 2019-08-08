import axios from 'axios';
import inquirer from 'inquirer';
import * as createPullRequest from '../../../src/services/github/createPullRequest';
import * as fetchCommitsByAuthor from '../../../src/services/github/fetchCommitsByAuthor';
import * as fs from '../../../src/services/fs-promisified';
import { BackportOptions } from '../../../src/options/options';
import { commitsWithPullRequestsMock } from '../services/github/mocks/commitsByAuthorMock';
import { initSteps } from '../../../src/steps/steps';
import * as childProcess from '../../../src/services/child-process-promisified';

describe('run through steps', () => {
  let rpcExecMock: jest.SpyInstance;
  let rpcExecOriginalMock: jest.SpyInstance;
  let inquirerPromptMock: jest.SpyInstance;
  let axiosHeadSpy: jest.SpyInstance;
  let axiosPostSpy: jest.SpyInstance;

  afterEach(() => {
    jest.clearAllMocks();
  });

  beforeEach(async () => {
    const options: BackportOptions = {
      accessToken: 'myAccessToken',
      all: false,
      apiHostname: 'api.github.com',
      author: 'sqren',
      branches: [],
      branchChoices: [
        { name: '6.x' },
        { name: '6.0' },
        { name: '5.6' },
        { name: '5.5' },
        { name: '5.4' }
      ],
      commitsCount: 10,
      fork: true,
      gitHostname: 'github.com',
      labels: [],
      multiple: false,
      multipleBranches: false,
      multipleCommits: false,
      prDescription: 'myPrDescription',
      prTitle: 'myPrTitle {baseBranch} {commitMessages}',
      repoName: 'kibana',
      repoOwner: 'elastic',
      sha: undefined,
      username: 'sqren'
    };

    rpcExecMock = (childProcess.exec as any) as jest.SpyInstance;
    rpcExecOriginalMock = (childProcess.execAsCallback as any) as jest.SpyInstance;

    jest.spyOn(fs, 'writeFile').mockResolvedValue(undefined);

    jest.spyOn(fetchCommitsByAuthor, 'fetchCommitsByAuthor');
    jest.spyOn(createPullRequest, 'createPullRequest');

    inquirerPromptMock = jest
      .spyOn(inquirer, 'prompt')
      // @ts-ignore
      .mockImplementationOnce(async (args: any) => {
        return { promptResult: args[0].choices[0].value };
      })
      .mockImplementationOnce(async (args: any) => {
        return { promptResult: args[0].choices[0].name };
      });

    // mock verifyAccessToken
    axiosHeadSpy = jest.spyOn(axios, 'head').mockReturnValueOnce(true as any);

    // mock axios post request (graphql)
    axiosPostSpy = jest
      .spyOn(axios, 'post')

      // mock author id
      .mockReturnValueOnce({
        data: {
          data: {
            user: {
              id: 'sqren_author_id'
            }
          }
        }
      } as any)

      // mock list of commits
      .mockReturnValueOnce({
        data: {
          data: commitsWithPullRequestsMock
        }
      } as any)

      // mock create pull request
      .mockReturnValueOnce({
        data: {
          html_url: 'pull request url',
          number: 1337
        }
      } as any);

    await initSteps(options);
  });

  it('should check whether access token is valid', () => {
    expect(axiosHeadSpy).toHaveBeenCalledWith(
      'https://api.github.com/repos/elastic/kibana?access_token=myAccessToken'
    );
  });

  it('should make correct POST requests', () => {
    expect(axiosPostSpy).toMatchSnapshot();
  });

  it('getCommit should be called with correct args', () => {
    expect(fetchCommitsByAuthor.fetchCommitsByAuthor).toHaveBeenCalledWith(
      expect.objectContaining({
        repoName: 'kibana',
        repoOwner: 'elastic',
        username: 'sqren',
        apiHostname: 'api.github.com'
      })
    );
  });

  it('createPullRequest should be called with correct args', () => {
    expect(createPullRequest.createPullRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        repoName: 'kibana',
        repoOwner: 'elastic',
        apiHostname: 'api.github.com'
      }),
      {
        base: '6.x',
        body: `Backports the following commits to 6.x:\n - Add 👻 (2e63475c)\n\nmyPrDescription`,
        head: 'sqren:backport/6.x/commit-2e63475c',
        title: 'myPrTitle 6.x Add 👻 (2e63475c)'
      }
    );
  });

  it('prompt calls should match snapshot', () => {
    expect(inquirer.prompt).toHaveBeenCalledTimes(2);
    expect(inquirerPromptMock.mock.calls).toMatchSnapshot();
  });

  it('exec should be called with correct args', () => {
    expect(rpcExecMock).toHaveBeenCalledTimes(9);
    expect(rpcExecMock.mock.calls).toMatchSnapshot();
  });

  it('git clone should be called with correct args', () => {
    expect(rpcExecOriginalMock).toHaveBeenCalledTimes(1);
    expect(rpcExecOriginalMock.mock.calls).toMatchSnapshot();
  });
});
