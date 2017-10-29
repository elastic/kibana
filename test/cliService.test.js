const axios = require('axios');
const inquirer = require('inquirer');
const nock = require('nock');
const httpAdapter = require('axios/lib/adapters/http');
const cliService = require('../src/cliService');
const utils = require('../src/utils');
const { mockBackportDirPath } = require('./testHelpers');

axios.defaults.host = 'http://localhost';
axios.defaults.adapter = httpAdapter;

describe('doBackportVersion', () => {
  beforeEach(() => {
    mockBackportDirPath();
    utils.exec = jest.fn().mockReturnValue(Promise.resolve());
    nock('https://api.github.com')
      .post(`/repos/elastic/kibana/pulls`)
      .query(true)
      .reply(200, {
        html_url: 'myHtmlUrl'
      });
  });

  it('with pull request reference', () => {
    return cliService
      .doBackportVersion({
        owner: 'elastic',
        repoName: 'kibana',
        commit: { message: 'myCommitMessage' },
        reference: { type: 'pullRequest', value: 'myPullRequest' },
        version: '6.x',
        username: 'sqren'
      })
      .then(res => {
        expect(JSON.parse(res.config.data)).toEqual({
          base: '6.x',
          body: 'Backports pull request #myPullRequest to 6.x',
          head: 'sqren:backport/6.x/pr-myPullRequest',
          title: '[6.x] myCommitMessage'
        });
        expect(res.config).toMatchSnapshot();
        expect(utils.exec.mock.calls).toMatchSnapshot();
      });
  });

  it('with commit reference', () => {
    return cliService
      .doBackportVersion({
        owner: 'elastic',
        repoName: 'kibana',
        commit: { message: 'myCommitMessage' },
        reference: { type: 'commit', value: 'myCommitSha' },
        version: '6.x',
        username: 'sqren'
      })
      .then(res => {
        expect(JSON.parse(res.config.data)).toEqual({
          base: '6.x',
          body: 'Backports commit myCommitSha to 6.x',
          head: 'sqren:backport/6.x/commit-myCommitSha',
          title: '[6.x] myCommitMessage'
        });
        expect(res.config).toMatchSnapshot();
        expect(utils.exec.mock.calls).toMatchSnapshot();
      });
  });
});

describe('getReference', () => {
  function mockGithubIssuesResponse(res) {
    return nock('https://api.github.com')
      .get(`/search/issues`)
      .query(true)
      .reply(200, res);
  }

  it('should use pull request when available', () => {
    mockGithubIssuesResponse({
      items: [{ number: 'myPullRequest' }]
    });

    return cliService
      .getReference('elastic', 'kibana', 'myCommitSha')
      .then(res =>
        expect(res).toEqual({ type: 'pullRequest', value: 'myPullRequest' })
      );
  });

  it('should use (short) commit sha when pull request is not available', () => {
    mockGithubIssuesResponse({ items: [] });

    return cliService
      .getReference('elastic', 'kibana', 'myCommitSha')
      .then(res => expect(res).toEqual({ type: 'commit', value: 'myCommi' }));
  });
});

describe('promptRepoInfo', () => {
  function mockPrompt() {
    inquirer.prompt = jest
      .fn()
      .mockReturnValueOnce(Promise.resolve({ fullRepoName: 'elastic/kibana' }));
  }

  describe('without matching cwd', () => {
    beforeEach(() => {
      mockPrompt();

      return cliService
        .promptRepoInfo(
          [{ name: 'elastic/kibana' }, { name: 'elastic/elasticsearch' }],
          '/foo/bar'
        )
        .then(res => (this.res = res));
    });

    it('should call prompt with available repositories', () => {
      expect(inquirer.prompt).toHaveBeenCalledWith([
        expect.objectContaining({
          choices: ['elastic/kibana', 'elastic/elasticsearch']
        })
      ]);
    });

    it('should return selected repository', () => {
      expect(this.res).toEqual({ owner: 'elastic', repoName: 'kibana' });
    });
  });

  describe('with matching cwd', () => {
    beforeEach(() => {
      mockPrompt();

      return cliService
        .promptRepoInfo(
          [{ name: 'elastic/kibana' }, { name: 'elastic/elasticsearch' }],
          '/foo/elasticsearch'
        )
        .then(res => (this.res = res));
    });

    it('should not call prompt', () => {
      expect(inquirer.prompt).not.toHaveBeenCalled();
    });

    it('should return selected repository', () => {
      expect(this.res).toEqual({ owner: 'elastic', repoName: 'elasticsearch' });
    });
  });
});
