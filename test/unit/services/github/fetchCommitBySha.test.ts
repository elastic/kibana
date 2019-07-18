import axios from 'axios';
import { fetchCommitBySha } from '../../../../src/services/github/fetchCommitBySha';
import { getDefaultOptions } from './getDefaultOptions';

describe('fetchCommitBySha', () => {
  it('should return single commit with pull request', async () => {
    const commitSha = 'myCommitSha';
    const options = getDefaultOptions();

    const axiosSpy = jest
      .spyOn(axios, 'get')

      // mock commits
      .mockResolvedValueOnce({
        data: { items: [{ commit: { message: 'myMessage' }, sha: commitSha }] }
      })

      // mock PRs
      .mockResolvedValueOnce({
        data: { items: [{ number: 'myPullRequestNumber' }] }
      });

    expect(await fetchCommitBySha({ ...options, sha: commitSha })).toEqual({
      message: 'myMessage (#myPullRequestNumber)',
      pullNumber: 'myPullRequestNumber',
      sha: 'myCommitSha'
    });

    expect(axiosSpy.mock.calls).toMatchSnapshot();
  });
});
