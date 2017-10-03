const inquirer = require('inquirer');
const Git = require('nodegit');
const { init } = require('../src/cli');
const {
  resetAllBranches,
  mockBackportDirPath,
  getFiles
} = require('./testHelpers');
const github = require('../src/github');
const git = require('../src/git');
const commitsMock = require('./mocks/commits.json');

const owner = 'elastic';
const repoName = 'backport-cli-test';
const fullRepoName = `elastic/${repoName}`;

beforeEach(() => {
  mockBackportDirPath();
  return resetAllBranches(owner, repoName);
});

afterAll(() => resetAllBranches(owner, repoName));

describe('cli', () => {
  beforeEach(() => {
    this.promptSpy = jest
      .spyOn(inquirer, 'prompt')
      .mockReturnValueOnce(Promise.resolve({ fullRepoName: fullRepoName }))
      .mockReturnValueOnce(
        Promise.resolve({
          commit: {
            sha: 'mySha',
            reference: { value: 'myPullRequest', type: 'pullRequest' }
          },
          version: 'myVersion'
        })
      );

    // Mock commits
    this.commitSpy = jest
      .spyOn(github, 'getCommits')
      .mockReturnValue(Promise.resolve(commitsMock));

    this.createPullRequestSpy = jest
      .spyOn(github, 'createPullRequest')
      .mockReturnValue(
        Promise.resolve({
          data: {
            html_url: 'myHtmlUrl'
          }
        })
      );

    this.cloneSpy = jest.spyOn(Git, 'Clone');

    this.resetSpy = jest
      .spyOn(Git.Reset, 'reset')
      .mockReturnValue(Promise.resolve());

    this.indexMock = {
      hasConflicts: jest.fn().mockReturnValue(0),
      writeTree: jest.fn().mockReturnValue(Promise.resolve('myOid'))
    };

    this.repoMock = {
      checkoutBranch: jest.fn().mockReturnValue(Promise.resolve()),
      createBranch: jest.fn().mockReturnValue(Promise.resolve()),
      createCommit: jest.fn().mockReturnValue(Promise.resolve()),
      fetchAll: jest.fn().mockReturnValue(Promise.resolve()),
      getBranchCommit: jest
        .fn()
        .mockReturnValue(Promise.resolve('myBranchHeadCommit')),
      getCommit: jest.fn().mockReturnValue(
        Promise.resolve({
          message: jest.fn().mockReturnValue('myCommitMessage')
        })
      ),
      getHeadCommit: jest.fn().mockReturnValue(Promise.resolve('myHeadCommit')),
      index: jest.fn().mockReturnValue(Promise.resolve(this.indexMock)),
      mergeBranches: jest.fn().mockReturnValue(Promise.resolve()),
      stateCleanup: jest.fn().mockReturnValue(Promise.resolve())
    };

    jest
      .spyOn(Git.Repository, 'open')
      .mockReturnValue(Promise.resolve(this.repoMock));

    jest.spyOn(Git, 'Clone').mockReturnValue(Promise.resolve('myClone'));

    jest
      .spyOn(Git.Cred, 'sshKeyFromAgent')
      .mockReturnValue(Promise.resolve('sshKey'));

    jest
      .spyOn(Git.Remote, 'create')
      .mockReturnValue(Promise.resolve('myRemote'));

    this.remoteLookupMock = {
      push: jest.fn().mockReturnValue(Promise.resolve())
    };
    jest
      .spyOn(Git.Remote, 'lookup')
      .mockReturnValue(Promise.resolve(this.remoteLookupMock));

    this.cherryPickedCommitMock = {
      author: jest.fn().mockReturnValue('myAuthor'),
      committer: jest.fn().mockReturnValue('myCommitter'),
      message: jest.fn().mockReturnValue('myCommitMessage')
    };

    jest
      .spyOn(Git.Commit, 'lookup')
      .mockReturnValue(Promise.resolve(this.cherryPickedCommitMock));

    jest.spyOn(Git.Cherrypick, 'cherrypick').mockReturnValue(Promise.resolve());

    return init({
      username: 'sqren',
      accessToken: 'myAccessToken',
      repositories: [
        {
          name: fullRepoName,
          versions: ['6.x', '6.0', '5.6', '5.5', '5.4']
        }
      ]
    });
  });

  afterEach(() => jest.restoreAllMocks());

  test('should not clone repo if it already exists', () => {
    expect(this.cloneSpy).not.toHaveBeenCalled();
  });

  test('checkoutBranch', () => {
    expect(this.repoMock.checkoutBranch.mock.calls).toEqual([
      ['master'],
      ['backport/myVersion/pr-myPullRequest']
    ]);
    expect(this.repoMock.checkoutBranch).toHaveBeenCalledTimes(2);
  });

  test('createBranch', () => {
    expect(this.repoMock.createCommit).toHaveBeenCalledTimes(1);
    expect(this.repoMock.createBranch).toHaveBeenCalledWith(
      'backport/myVersion/pr-myPullRequest',
      'myBranchHeadCommit',
      true
    );
  });

  test('createCommit', () => {
    expect(this.repoMock.createCommit).toHaveBeenCalledTimes(1);
    expect(this.repoMock.createCommit).toHaveBeenCalledWith(
      'HEAD',
      'myAuthor',
      'myCommitter',
      'myCommitMessage',
      'myOid',
      ['myHeadCommit']
    );
  });

  test('getCommit', () => {
    expect(this.repoMock.getCommit).toHaveBeenCalledTimes(1);
    expect(this.repoMock.getCommit).toHaveBeenCalledWith('mySha');
  });

  test('getHeadCommit', () => {
    expect(this.repoMock.getHeadCommit).toHaveBeenCalledTimes(2);
    expect(this.repoMock.getHeadCommit).toHaveBeenCalledWith();
  });

  test('index', () => {
    expect(this.repoMock.index).toHaveBeenCalledTimes(1);
    expect(this.repoMock.index).toHaveBeenCalledWith();
  });

  test('mergeBranches', () => {
    expect(this.repoMock.mergeBranches).toHaveBeenCalledTimes(1);
    expect(this.repoMock.mergeBranches).toHaveBeenCalledWith(
      'master',
      'origin/master'
    );
  });

  test('stateCleanup', () => {
    expect(this.repoMock.stateCleanup).toHaveBeenCalledTimes(1);
    expect(this.repoMock.stateCleanup).toHaveBeenCalledWith();
  });

  test('should reset branch', () => {
    expect(this.resetSpy).toHaveBeenCalledWith(
      this.repoMock,
      'myHeadCommit',
      3
    );
  });
});

describe('git', () => {
  test('openRepo: Can open and get the first commit', () => {
    return git
      .openRepo(owner, repoName)
      .then(repo => repo.getHeadCommit())
      .then(commit => {
        expect(commit.sha()).toBe('57da351791ac51e7342bb265fd8324867893e8ce');
      });
  });

  test('cherrypick: can cherrypick a commit', () => {
    return git.openRepo(owner, repoName).then(repo =>
      repo
        .checkoutBranch('6.x')
        .then(() =>
          git.cherrypick(repo, '57da351791ac51e7342bb265fd8324867893e8ce')
        )
        .then(() => repo.getCurrentBranch())
        .then(currentBranch => {
          expect(currentBranch.name()).toBe('refs/heads/6.x');
        })
        .then(() => repo.getHeadCommit())
        .then(headCommit => {
          expect(headCommit.sha()).toBe(
            'c64301672921e527e3bb5f4b997f9529b7fb276c'
          );
          expect(headCommit.committer().name()).toBe('Søren Louv-Jansen');
          expect(headCommit.message().trim()).toBe('Adding third file');

          return headCommit
            .getDiff()
            .then(diff => diff[0].toBuf(1))
            .then(diffPatch => {
              expect(diffPatch).toContain('This is my third file');
            });
        })
    );
  });

  test('createAndCheckoutBranch: can create feature branch based on version branch', () => {
    return git.openRepo(owner, repoName).then(repo =>
      git
        .createAndCheckoutBranch(repo, '6.x', 'my-feature-branch')
        .then(() => repo.getCurrentBranch())
        .then(currentBranch =>
          expect(currentBranch.shorthand()).toBe('my-feature-branch')
        )
        .then(() => repo.getHeadCommit())
        .then(headCommit => {
          expect(headCommit.sha()).toBe(
            '10a4f43bd494c9a2c7a17b8a401e3f94a51aff8e'
          );

          expect(headCommit.message().trim()).toBe('Adding first file');

          return getFiles(headCommit);
        })
        .then(files => {
          expect(files).toEqual([['a.txt']]);
        })
    );
  });
});
