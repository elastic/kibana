import {
  fetchCommitsByAuthor,
  fetchCommitBySha
} from '../../src/services/github';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { BackportOptions } from '../../src/options/options';

function getDefaultOptions(options: Partial<BackportOptions> = {}) {
  return {
    repoOwner: 'elastic',
    repoName: 'kibana',
    accessToken: 'myAccessToken',
    username: 'sqren',
    apiHostname: 'api.github.com',
    ...options
  } as BackportOptions;
}

describe('fetchCommitsByAuthor', () => {
  it('should return commits with pull request', async () => {
    const mock = new MockAdapter(axios);
    const commitSha = 'myCommitSha';
    const options = getDefaultOptions();
    const { repoOwner, repoName, accessToken, username } = options;

    mock
      .onGet(
        `https://api.github.com/repos/${repoOwner}/${repoName}/commits?access_token=${accessToken}&per_page=5&author=${username}`
      )
      .reply(200, [{ commit: { message: 'myMessage' }, sha: commitSha }]);

    mock
      .onGet(
        `https://api.github.com/search/issues?q=repo:${repoOwner}/${repoName}+${commitSha}+base:master&access_token=${accessToken}`
      )
      .reply(200, { items: [{ number: 'myPullRequestNumber' }] });

    expect(await fetchCommitsByAuthor(options)).toEqual([
      {
        message: 'myMessage',
        pullNumber: 'myPullRequestNumber',
        sha: 'myCommitSha'
      }
    ]);
  });

  it('should return commits without pull request', async () => {
    const mock = new MockAdapter(axios);
    const commitSha = 'myCommitSha';
    const options = getDefaultOptions();
    const { repoOwner, repoName, accessToken, username } = options;

    mock
      .onGet(
        `https://api.github.com/repos/${repoOwner}/${repoName}/commits?access_token=${accessToken}&per_page=5&author=${username}`
      )
      .reply(200, [{ commit: { message: 'myMessage' }, sha: commitSha }]);

    mock
      .onGet(
        `https://api.github.com/search/issues?q=repo:${repoOwner}/${repoName}+${commitSha}+base:master&access_token=${accessToken}`
      )
      .reply(200, { items: [] });

    expect(await fetchCommitsByAuthor(options)).toEqual([
      {
        message: 'myMessage',
        pullNumber: undefined,
        sha: 'myCommitSha'
      }
    ]);
  });

  it('allows a custom github api hostname', async () => {
    const mock = new MockAdapter(axios);
    const options = getDefaultOptions({
      apiHostname: 'api.github.my-company.com'
    });
    const { repoOwner, repoName, accessToken, username } = options;
    const commitSha = 'myCommitSha';

    mock
      .onGet(
        `https://api.github.my-company.com/repos/${repoOwner}/${repoName}/commits?access_token=${accessToken}&per_page=5&author=${username}`
      )
      .reply(200, [{ commit: { message: 'myMessage' }, sha: commitSha }]);

    mock
      .onGet(
        `https://api.github.my-company.com/search/issues?q=repo:${repoOwner}/${repoName}+${commitSha}+base:master&access_token=${accessToken}`
      )
      .reply(200, { items: [{ number: 'myPullRequestNumber' }] });

    expect(await fetchCommitsByAuthor(options)).toEqual([
      {
        message: 'myMessage',
        pullNumber: 'myPullRequestNumber',
        sha: 'myCommitSha'
      }
    ]);
  });
});

describe('fetchCommitBySha', () => {
  it('should return single commit with pull request', async () => {
    const mock = new MockAdapter(axios);
    const commitSha = 'myCommitSha';
    const options = getDefaultOptions();
    const { repoOwner, repoName, accessToken } = options;

    mock
      .onGet(
        `https://api.github.com/search/commits?q=hash:${commitSha}%20repo:${repoOwner}/${repoName}&per_page=1&access_token=${accessToken}`
      )
      .reply(200, {
        items: [{ commit: { message: 'myMessage' }, sha: commitSha }]
      });

    mock
      .onGet(
        `https://api.github.com/search/issues?q=repo:${repoOwner}/${repoName}+${commitSha}+base:master&access_token=${accessToken}`
      )
      .reply(200, { items: [{ number: 'myPullRequestNumber' }] });

    expect(await fetchCommitBySha({ ...options, sha: commitSha })).toEqual({
      message: 'myMessage',
      pullNumber: 'myPullRequestNumber',
      sha: 'myCommitSha'
    });
  });
});
