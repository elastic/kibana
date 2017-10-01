const process = require('child_process');
const promisify = require('es6-promisify');
const exec = promisify(process.exec);
const path = require('path');
const env = require('../src/env');

function resetHard(branchName) {
  return exec(
    `git checkout ${branchName} && git reset --hard origin/${branchName}`,
    {
      cwd: env.getRepoPath('test-repo')
    }
  );
}

function deleteFeatureBranch() {
  return exec(`git branch -D my-feature-branch`, {
    cwd: env.getRepoPath('test-repo')
  }).catch(e => {
    if (!e.message.includes("branch 'my-feature-branch' not found")) {
      throw e;
    }
  });
}

function resetAllBranches() {
  return resetHard('master')
    .then(() => resetHard('6.x'))
    .then(() => {
      return exec(`git checkout master`, { cwd: env.getRepoPath('test-repo') });
    })
    .then(deleteFeatureBranch);
}

function mockBackportDirPath() {
  env.getBackportDirPath = jest.fn(() => path.join(__dirname, '.backport'));
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
