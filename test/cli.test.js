const inquirer = require('inquirer');
const axios = require('axios');
const nock = require('nock');
const httpAdapter = require('axios/lib/adapters/http');
const { init } = require('../src/cli');
const github = require('../src/github');
const commitsMock = require('./mocks/commits.json');
const { mockBackportDirPath } = require('./testHelpers');
const utils = require('../src/utils');

const host = 'http://localhost';

axios.defaults.host = host;
axios.defaults.adapter = httpAdapter;

describe('select commit that originated from pull request', () => {
  const owner = 'elastic';
  const repoName = 'backport-cli-test';
  const fullRepoName = `${owner}/${repoName}`;

  beforeEach(() => {
    mockBackportDirPath();
    jest.spyOn(utils, 'exec').mockReturnValue(Promise.resolve());

    jest
      .spyOn(inquirer, 'prompt')
      .mockReturnValueOnce(Promise.resolve({ fullRepoName }))
      .mockReturnValueOnce(
        Promise.resolve({
          commit: {
            message: 'myCommitMessage',
            sha: 'mySha'
          }
        })
      )
      .mockReturnValueOnce(
        Promise.resolve({
          version: 'myVersion'
        })
      );

    nock('https://api.github.com')
      .get(`/repos/${owner}/${repoName}/commits`)
      .query({ author: 'sqren', per_page: '5', access_token: 'myAccessToken' })
      .reply(200, commitsMock);

    nock('https://api.github.com')
      .get(`/search/issues`)
      .query({
        q: 'repo:elastic/backport-cli-test mySha',
        access_token: 'myAccessToken'
      })
      .reply(200, {
        items: [
          {
            number: 'myPullRequest'
          }
        ]
      });

    nock('https://api.github.com')
      .post(`/repos/${owner}/${repoName}/pulls`)
      .query({ access_token: 'myAccessToken' })
      .reply(200, {
        html_url: 'myHtmlUrl'
      });

    jest.spyOn(github, 'getCommits');
    jest.spyOn(github, 'createPullRequest');

    return init(
      {
        username: 'sqren',
        accessToken: 'myAccessToken',
        repositories: [
          {
            name: fullRepoName,
            versions: ['6.x', '6.0', '5.6', '5.5', '5.4']
          }
        ]
      },
      { cwd: '/my/path' }
    );
  });

  it('prompt should display list of repository names', () => {
    expect(inquirer.prompt).toHaveBeenCalledWith([
      {
        choices: ['elastic/backport-cli-test'],
        message: 'Select repository',
        name: 'fullRepoName',
        type: 'list'
      }
    ]);
  });

  it('getCommit should be called with correct args', () => {
    expect(github.getCommits).toHaveBeenCalledWith(
      'elastic',
      'backport-cli-test',
      'sqren'
    );
  });

  it('createPullRequest should be called with correct args', () => {
    expect(github.createPullRequest).toHaveBeenCalledWith(
      'elastic',
      'backport-cli-test',
      {
        base: 'myVersion',
        body: 'Backports pull request #myPullRequest to myVersion',
        head: 'sqren:backport/myVersion/pr-myPullRequest',
        title: '[Backport] myCommitMessage'
      }
    );
  });

  it('prompt calls should match snapshot', () => {
    expect(inquirer.prompt.mock.calls).toMatchSnapshot();
  });

  it('exec should be called with correct args', () => {
    expect(utils.exec.mock.calls).toMatchSnapshot();
  });
});

describe('select commit that originated from commit', () => {
  const owner = 'elastic';
  const repoName = 'backport-cli-test';
  const fullRepoName = `${owner}/${repoName}`;

  beforeEach(() => {
    mockBackportDirPath();
    jest.spyOn(utils, 'exec').mockReturnValue(Promise.resolve());

    jest
      .spyOn(inquirer, 'prompt')
      .mockReturnValueOnce(Promise.resolve({ fullRepoName }))
      .mockReturnValueOnce(
        Promise.resolve({
          commit: {
            message: 'myCommitMessage',
            sha: 'mySha'
          }
        })
      )
      .mockReturnValueOnce(
        Promise.resolve({
          version: 'myVersion'
        })
      );

    nock('https://api.github.com')
      .get(`/repos/${owner}/${repoName}/commits`)
      .query({ author: 'sqren', per_page: '5', access_token: 'myAccessToken' })
      .reply(200, commitsMock);

    nock('https://api.github.com')
      .get(`/search/issues`)
      .query({
        q: 'repo:elastic/backport-cli-test mySha',
        access_token: 'myAccessToken'
      })
      .reply(200, {
        items: []
      });

    nock('https://api.github.com')
      .post(`/repos/${owner}/${repoName}/pulls`)
      .query({ access_token: 'myAccessToken' })
      .reply(200, {
        html_url: 'myHtmlUrl'
      });

    jest.spyOn(github, 'getCommits');
    jest.spyOn(github, 'createPullRequest');

    return init(
      {
        username: 'sqren',
        accessToken: 'myAccessToken',
        repositories: [
          {
            name: fullRepoName,
            versions: ['6.x', '6.0', '5.6', '5.5', '5.4']
          }
        ]
      },
      { cwd: '/my/path' }
    );
  });

  it('createPullRequest should be called with correct args', () => {
    expect(github.createPullRequest).toHaveBeenCalledWith(
      'elastic',
      'backport-cli-test',
      {
        base: 'myVersion',
        body: 'Backports commit mySha to myVersion',
        head: 'sqren:backport/myVersion/commit-mySha',
        title: '[Backport] myCommitMessage'
      }
    );
  });
});
