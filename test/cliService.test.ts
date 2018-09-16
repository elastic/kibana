import rimraf from 'rimraf';
import axios from 'axios';
import nock from 'nock';
import httpAdapter from 'axios/lib/adapters/http';
import * as childProcess from 'child_process';

import * as rpc from '../src/lib/rpc';
import {
  maybeSetupRepo,
  doBackportVersion,
  getCommitBySha,
  getReferenceLong
} from '../src/cli/cliService';
import commitMock from './mocks/commit.json';

axios.defaults.adapter = httpAdapter;

describe('doBackportVersion', () => {
  let addLabelMock: nock.Scope;
  beforeEach(() => {
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
          'Backports the following commits to 6.x:\n - myCommitMessage (#1000)\n - myOtherCommitMessage (#2000)',
        head: 'sqren:backport/6.x/pr-1000_pr-2000',
        base: '6.x'
      })
      .query(true)
      .reply(200, {
        number: 1337,
        html_url: 'myHtmlUrl'
      });

    const commits = [
      {
        sha: 'mySha',
        message: 'myCommitMessage',
        pullRequest: 1000
      },
      {
        sha: 'mySha2',
        message: 'myOtherCommitMessage',
        pullRequest: 2000
      }
    ];

    const execSpy = jest.spyOn(childProcess, 'exec');

    const res = await doBackportVersion(
      'elastic',
      'kibana',
      commits,
      '6.x',
      'sqren',
      ['backport']
    );

    expect(res).toMatchSnapshot();
    expect(execSpy.mock.calls).toMatchSnapshot();
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

    const commits = [
      {
        sha: 'mySha',
        message: 'myCommitMessage'
      }
    ];

    const execSpy = jest.spyOn(childProcess, 'exec');

    const res = await doBackportVersion(
      'elastic',
      'kibana',
      commits,
      '6.x',
      'sqren'
    );

    expect(res).toMatchSnapshot();
    expect(execSpy.mock.calls).toMatchSnapshot();
    expect(createPRMock.isDone()).toBe(true);
    expect(addLabelMock.isDone()).toBe(false);
  });
});

describe('getCommitBySha', () => {
  it('should return a single commit', async () => {
    nock('https://api.github.com')
      .get(`/search/commits`)
      .query(true)
      .reply(200, {
        items: [commitMock]
      });

    nock('https://api.github.com')
      .get(`/search/issues`)
      .query(true)
      .reply(200, {
        items: []
      });

    const commits = await getCommitBySha('elastic', 'kibana', 'myCommitSha');
    expect(commits).toEqual({
      message: '[Chrome] Bootstrap Angular into document.body (#15158)',
      sha: 'myCommitSha',
      pullRequest: undefined
    });
  });

  it('should throw error if sha does not exist', async () => {
    nock('https://api.github.com')
      .get(`/search/commits`)
      .query(true)
      .reply(200, {
        items: []
      });

    await expect(
      getCommitBySha('elastic', 'kibana', 'myCommitSha')
    ).rejects.toThrowError('No commit found for SHA: myCommitSha');
  });

  it('should add PR number if available', async () => {
    nock('https://api.github.com')
      .get(`/search/commits`)
      .query(true)
      .reply(200, {
        items: [commitMock]
      });

    nock('https://api.github.com')
      .get(`/search/issues`)
      .query(true)
      .reply(200, {
        items: [{ number: 1338 }]
      });

    expect(await getCommitBySha('elastic', 'kibana', 'myCommitSha')).toEqual({
      message: '[Chrome] Bootstrap Angular into document.body (#15158)',
      pullRequest: 1338,
      sha: 'myCommitSha'
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
        pullRequest: 1337,
        sha: 'mySha1234567',
        message: 'myMessage'
      })
    ).toEqual('#1337');
  });
});

describe('maybeSetupRepo', () => {
  it('should delete repo if an error occurs', async () => {
    expect.assertions(1);
    jest.spyOn(rpc, 'mkdirp').mockImplementationOnce(() => {
      throw new Error();
    });

    try {
      await maybeSetupRepo('elastic', 'kibana', 'sqren');
    } catch (e) {
      expect(rimraf).toHaveBeenCalledWith(
        '/myHomeDir/.backport/repositories/elastic/kibana',
        expect.any(Function)
      );
    }
  });
});
