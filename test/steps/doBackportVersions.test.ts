import axios from 'axios';
import nock from 'nock';
import httpAdapter from 'axios/lib/adapters/http';
import * as childProcess from 'child_process';
import {
  doBackportVersion,
  getReferenceLong
} from '../../src/steps/doBackportVersions';

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
        pullNumber: 1000
      },
      {
        sha: 'mySha2',
        message: 'myOtherCommitMessage',
        pullNumber: 2000
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
