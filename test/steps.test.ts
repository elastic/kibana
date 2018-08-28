import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import inquirer from 'inquirer';
import * as childProcess from 'child_process';
import commitsMock from './mocks/commits.json';

import { initSteps } from '../src/cli/steps';
import * as github from '../src/lib/github';
import * as rpc from '../src/lib/rpc';

function mockGetPullRequest(
  axiosMock: MockAdapter,
  owner: string,
  repoName: string,
  commitSha: string,
  accessToken: string
) {
  return axiosMock
    .onGet(
      `https://api.github.com/search/issues?q=repo:${owner}/${repoName}+${commitSha}+base:master&access_token=${accessToken}`
    )
    .reply(200, {
      items: [
        {
          number: `PR for ${commitSha}`
        }
      ]
    });
}

function mockGetCommits(
  axiosMock: MockAdapter,
  {
    owner = 'elastic',
    repoName = 'kibana',
    accessToken = 'myAccessToken',
    author = 'sqren',
    perPage = 5,
    res
  }: {
    owner?: string;
    repoName?: string;
    accessToken?: string;
    author?: string;
    perPage?: number;
    res: Array<{}>;
  }
) {
  return axiosMock
    .onGet(
      `https://api.github.com/repos/${owner}/${repoName}/commits?access_token=${accessToken}&per_page=${perPage}&author=${author}`
    )
    .reply(200, res);
}

function mockCreatePullRequest(
  axiosMock: MockAdapter,
  {
    owner = 'elastic',
    repoName = 'kibana',
    accessToken = 'myAccessToken',
    res
  }: {
    owner?: string;
    repoName?: string;
    accessToken?: string;
    res: any;
  }
) {
  return axiosMock
    .onPost(
      `https://api.github.com/repos/${owner}/${repoName}/pulls?access_token=${accessToken}`
    )
    .reply(200, res);
}

describe('run through steps', () => {
  let axiosMock: MockAdapter;
  let execMock: jest.SpyInstance;
  let inquirerPromptMock: jest.Mock;

  afterEach(() => {
    inquirerPromptMock.mockClear();
    execMock.mockClear();
  });

  beforeEach(async () => {
    const owner = 'elastic';
    const repoName = 'kibana';
    const upstream = `${owner}/${repoName}`;
    const accessToken = 'myAccessToken';

    execMock = jest.spyOn(childProcess, 'exec');

    jest.spyOn(rpc, 'writeFile').mockResolvedValue(undefined);
    jest.spyOn(rpc, 'mkdirp').mockResolvedValue(undefined);

    jest.spyOn(github, 'getCommits');
    jest.spyOn(github, 'createPullRequest');

    inquirerPromptMock = jest
      .spyOn(inquirer, 'prompt')
      .mockResolvedValueOnce({
        promptResult: {
          message: 'myCommitMessage',
          sha: 'commitSha',
          pullRequest: 'myPullRequest'
        }
      })
      .mockResolvedValueOnce({
        promptResult: '6.2'
      });

    axiosMock = new MockAdapter(axios);
    mockGetCommits(axiosMock, {
      owner,
      repoName,
      accessToken,
      res: commitsMock
    });

    mockGetPullRequest(
      axiosMock,
      owner,
      repoName,
      'commitSha',
      'myAccessToken'
    );
    mockGetPullRequest(
      axiosMock,
      owner,
      repoName,
      'commitSha2',
      'myAccessToken'
    );
    mockGetPullRequest(
      axiosMock,
      owner,
      repoName,
      'commitSha3',
      'myAccessToken'
    );

    mockCreatePullRequest(axiosMock, {
      res: {
        html_url: 'myHtmlUrl'
      }
    });

    await initSteps({
      username: 'sqren',
      accessToken: 'myAccessToken',
      multiple: false,
      multipleBranches: false,
      multipleCommits: false,
      upstream,
      branchChoices: [
        { name: '6.x' },
        { name: '6.0' },
        { name: '5.6' },
        { name: '5.5' },
        { name: '5.4' }
      ],
      all: false,
      labels: []
    });
  });

  it('should make correct requests', () => {
    // TODO: Make PR to DefinitelyTypes to add history to mock object
    expect((axiosMock as any).history).toMatchSnapshot();
  });

  it('getCommit should be called with correct args', () => {
    expect(github.getCommits).toHaveBeenCalledWith(
      'elastic',
      'kibana',
      'sqren'
    );
  });

  it('createPullRequest should be called with correct args', () => {
    expect(github.createPullRequest).toHaveBeenCalledWith('elastic', 'kibana', {
      base: '6.2',
      body: `Backports the following commits to 6.2:\n - myCommitMessage (#myPullRequest)`,
      head: 'sqren:backport/6.2/pr-myPullRequest',
      title: '[6.2] myCommitMessage'
    });
  });

  it('prompt calls should match snapshot', () => {
    expect(inquirer.prompt).toHaveBeenCalledTimes(2);
    expect(inquirerPromptMock.mock.calls).toMatchSnapshot();
  });

  it('exec should be called with correct args', () => {
    expect(execMock).toHaveBeenCalledTimes(7);
    expect(execMock.mock.calls).toMatchSnapshot();
  });
});
