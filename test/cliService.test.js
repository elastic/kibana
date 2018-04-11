const axios = require('axios');
const nock = require('nock');
const httpAdapter = require('axios/lib/adapters/http');

const cliService = require('../src/cli/cliService');
const rpc = require('../src/lib/rpc');
const commitMock = require('./mocks/commit.json');

axios.defaults.host = 'http://localhost';
axios.defaults.adapter = httpAdapter;

describe('doBackportVersion', () => {
  let addLabelMock;
  beforeEach(() => {
    rpc.exec = jest.fn().mockReturnValue(Promise.resolve());
    rpc.mkdirp = jest.fn().mockReturnValue(Promise.resolve());

    addLabelMock = nock('https://api.github.com')
      .post(`/repos/elastic/kibana/issues/1337/labels`, ['backport'])
      .query(true)
      .reply(200, {});
  });

  it('with pull request reference', async () => {
    const createPRMock = nock('https://api.github.com')
      .post(`/repos/elastic/kibana/pulls`, {
        title: '[6.x] myCommitMessage | myOtherCommitMessage',
        body:
          'Backports the following commits to 6.x:\n - myCommitMessage (#myPullRequest)\n - myOtherCommitMessage (#myOtherPullRequest)',
        head: 'sqren:backport/6.x/pr-myPullRequest_pr-myOtherPullRequest',
        base: '6.x'
      })
      .query(true)
      .reply(200, {
        number: 1337,
        html_url: 'myHtmlUrl'
      });

    const res = await cliService.doBackportVersion({
      owner: 'elastic',
      repoName: 'kibana',
      commits: [
        {
          sha: 'mySha',
          message: 'myCommitMessage',
          pullRequest: 'myPullRequest'
        },
        {
          sha: 'mySha2',
          message: 'myOtherCommitMessage',
          pullRequest: 'myOtherPullRequest'
        }
      ],
      branch: '6.x',
      username: 'sqren',
      labels: ['backport']
    });

    expect(res.config).toMatchSnapshot();
    expect(rpc.exec.mock.calls).toMatchSnapshot();
    expect(createPRMock.isDone()).toBe(true);
    expect(addLabelMock.isDone()).toBe(true);
  });

  it('without pull request reference', async () => {
    const createPRMock = nock('https://api.github.com')
      .post(`/repos/elastic/kibana/pulls`, {
        title: '[6.x] myCommitMessage',
        body:
          'Backports the following commits to 6.x:\n - myCommitMessage (mySha)',
        head: 'sqren:backport/6.x/commit-mySha',
        base: '6.x'
      })
      .query(true)
      .reply(200, {
        number: 1337,
        html_url: 'myHtmlUrl'
      });

    const res = await cliService.doBackportVersion({
      owner: 'elastic',
      repoName: 'kibana',
      commits: [
        {
          sha: 'mySha',
          message: 'myCommitMessage'
        }
      ],
      branch: '6.x',
      username: 'sqren'
    });

    expect(res.config).toMatchSnapshot();
    expect(rpc.exec.mock.calls).toMatchSnapshot();
    expect(createPRMock.isDone()).toBe(true);
    expect(addLabelMock.isDone()).toBe(false);
  });
});

describe('getCommitBySha', () => {
  let commits;
  beforeEach(async () => {
    nock('https://api.github.com')
      .get(`/repos/elastic/kibana/commits/mySha`)
      .query(true)
      .reply(200, commitMock);

    commits = await cliService.getCommitBySha({
      owner: 'elastic',
      repoName: 'kibana',
      sha: 'mySha'
    });
  });

  it('should return a single commit in an array', () => {
    expect(commits).toEqual([
      {
        message: '[Chrome] Bootstrap Angular into document.body (#15158)',
        sha: 'f3430595978a6123c65f7501e61386de62b80b6e'
      }
    ]);
  });
});

describe('getReferenceLong', () => {
  it('should return a sha', () => {
    expect(cliService.getReferenceLong({ sha: 'mySha1234567' })).toEqual(
      'mySha12'
    );
  });

  it('should return a pr', () => {
    expect(
      cliService.getReferenceLong({ pullRequest: '1337', sha: 'mySha1234567' })
    ).toEqual('#1337');
  });
});

describe('withPullRequest', () => {
  function mockGithubIssuesResponse(res) {
    return nock('https://api.github.com')
      .get(`/search/issues`)
      .query(true)
      .reply(200, res);
  }

  it('should decorate commit with pull request if available', async () => {
    mockGithubIssuesResponse({
      items: [{ number: 'myPullRequest' }]
    });

    const res = await cliService.withPullRequest('elastic', 'kibana', [
      { message: 'myCommitMessage' }
    ]);

    expect(res).toEqual([
      { message: 'myCommitMessage', pullRequest: 'myPullRequest' }
    ]);
  });

  it('should not decorate commit, when pull request is not available', async () => {
    mockGithubIssuesResponse({ items: [] });

    const res = await cliService.withPullRequest('elastic', 'kibana', [
      { sha: 'myCommitSha', message: 'myCommitMessage' }
    ]);

    expect(res).toEqual([
      {
        sha: 'myCommitSha',
        message: 'myCommitMessage',
        pullRequest: undefined
      }
    ]);
  });
});
