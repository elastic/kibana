import { Commit } from '../entrypoint.module';

export function filterUnmergedCommits(commit: Commit) {
  return commit.expectedTargetPullRequests.some((pr) => pr.state !== 'MERGED');
}
