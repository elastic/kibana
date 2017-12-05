const axios = require('axios');
const inquirer = require('inquirer');
const nock = require('nock');
const os = require('os');
const httpAdapter = require('axios/lib/adapters/http');

const commitsMock = require('./mocks/commits.json');

const initSteps = require('../src/cli/steps');
const github = require('../src/lib/github');
const rpc = require('../src/lib/rpc');

describe('run through steps', () => {
  beforeEach(() => {
    const owner = 'elastic';
    const repoName = 'kibana';
    const upstream = `${owner}/${repoName}`;
    axios.defaults.host = 'http://localhost';
    axios.defaults.adapter = httpAdapter;

    os.homedir = jest.fn(() => '/homefolder');
    rpc.exec = jest.fn().mockReturnValue(Promise.resolve());
    rpc.writeFile = jest.fn().mockReturnValue(Promise.resolve());
    rpc.mkdirp = jest.fn().mockReturnValue(Promise.resolve());
    rpc.statSync = jest.fn(() => ({ mode: 33152 }));

    github.getCommits = jest.fn(github.getCommits);
    github.createPullRequest = jest.fn(github.createPullRequest);

    inquirer.prompt = jest
      .fn()
      .mockReturnValueOnce(
        Promise.resolve({
          promptResult: {
            message: 'myCommitMessage',
            sha: 'mySha'
          }
        })
      )
      .mockReturnValueOnce(
        Promise.resolve({
          promptResult: '6.2'
        })
      );

    nock('https://api.github.com')
      .get(`/repos/${owner}/${repoName}/commits`)
      .query({ author: 'sqren', per_page: '5', access_token: 'myAccessToken' })
      .reply(200, commitsMock);

    nock('https://api.github.com')
      .get(`/search/issues`)
      .query({
        q: 'repo:elastic/kibana mySha',
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

    return initSteps({
      username: 'sqren',
      accessToken: 'myAccessToken',
      upstream,
      branches: ['6.x', '6.0', '5.6', '5.5', '5.4'],
      own: true
    });
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
    expect(inquirer.prompt.mock.calls).toMatchSnapshot();
  });

  it('exec should be called with correct args', () => {
    expect(rpc.exec.mock.calls).toMatchSnapshot();
  });
});
