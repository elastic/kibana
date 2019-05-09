import { commitMock } from '../mocks/commit';
import axios from 'axios';
import nock from 'nock';
import httpAdapter from 'axios/lib/adapters/http';
import { getCommitBySha } from '../../src/steps/getCommits';

axios.defaults.adapter = httpAdapter;

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

    const commits = await getCommitBySha(
      'elastic',
      'kibana',
      'myCommitSha',
      'api.github.com'
    );
    expect(commits).toEqual({
      message: '[Chrome] Bootstrap Angular into document.body (#15158)',
      sha: 'myCommitSha',
      pullNumber: undefined
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
      getCommitBySha('elastic', 'kibana', 'myCommitSha', 'api.github.com')
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

    expect(
      await getCommitBySha('elastic', 'kibana', 'myCommitSha', 'api.github.com')
    ).toEqual({
      message: '[Chrome] Bootstrap Angular into document.body (#15158)',
      pullNumber: 1338,
      sha: 'myCommitSha'
    });
  });
});
