import axios from 'axios';
import httpAdapter from 'axios/lib/adapters/http';
import nock from 'nock';
import { getCommitBySha } from '../../../src/steps/getCommits';
import { BackportOptions } from '../../../src/options/options';
import { commitByShaMock } from '../services/github/mocks/commitByShaMock';

axios.defaults.adapter = httpAdapter;

describe('getCommitBySha', () => {
  it('should return a single commit without PR', async () => {
    nock('https://api.github.com')
      .get(`/search/commits`)
      .query(true)
      .reply(200, {
        items: [commitByShaMock]
      });

    nock('https://api.github.com')
      .get(`/search/issues`)
      .query(true)
      .reply(200, {
        items: []
      });

    const commit = await getCommitBySha({
      repoOwner: 'elastic',
      repoName: 'kibana',
      sha: 'myCommitSha',
      apiHostname: 'api.github.com'
    } as BackportOptions & { sha: string });
    expect(commit).toEqual({
      message: '[Chrome] Bootstrap Angular into document.body (myCommit)',
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
      getCommitBySha({
        repoOwner: 'elastic',
        repoName: 'kibana',
        sha: 'myCommitSha',
        apiHostname: 'api.github.com'
      } as BackportOptions & { sha: string })
    ).rejects.toThrowError('No commit found on master with sha "myCommitSha"');
  });

  it('should add PR number if available', async () => {
    nock('https://api.github.com')
      .get(`/search/commits`)
      .query(true)
      .reply(200, {
        items: [commitByShaMock]
      });

    nock('https://api.github.com')
      .get(`/search/issues`)
      .query(true)
      .reply(200, {
        items: [{ number: 1338 }]
      });

    expect(
      await getCommitBySha({
        repoOwner: 'elastic',
        repoName: 'kibana',
        sha: 'myCommitSha',
        apiHostname: 'api.github.com'
      } as BackportOptions & { sha: string })
    ).toEqual({
      message: '[Chrome] Bootstrap Angular into document.body (#1338)',
      pullNumber: 1338,
      sha: 'myCommitSha'
    });
  });
});
