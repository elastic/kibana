const process = require('child_process');
const promisify = require('es6-promisify');
const exec = promisify(process.exec);
const path = require('path');
const env = require('../src/env');

function resetHard(branchName, owner, repoName) {
  return exec(
    `git checkout ${branchName} && git reset --hard origin/${branchName}`,
    {
      cwd: env.getRepoPath(owner, repoName)
    }
  );
}

function deleteFeatureBranch(owner, repoName) {
  return exec(`git branch -D my-feature-branch`, {
    cwd: env.getRepoPath(owner, repoName)
  }).catch(e => {
    if (!e.message.includes("branch 'my-feature-branch' not found")) {
      throw e;
    }
  });
}

function resetAllBranches(owner, repoName) {
  return resetHard('master', owner, repoName)
    .then(() => resetHard('6.x', owner, repoName))
    .then(() => {
      return exec(`git checkout master`, {
        cwd: env.getRepoPath(owner, repoName)
      });
    })
    .then(() => deleteFeatureBranch(owner, repoName));
}

function mockBackportDirPath() {
  env.getBackportDirPath = jest.fn(() => path.join('homefolder', '.backport'));
}

function getFiles(commit) {
  return commit.getDiff().then(diffs => {
    return Promise.all(
      diffs.map(diff =>
        diff
          .patches()
          .then(patches => patches.map(patch => patch.newFile().path()))
      )
    );
  });
}

module.exports = {
  mockBackportDirPath,
  resetAllBranches,
  getFiles
};
