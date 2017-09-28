function cherrypick(repo, cherrypickSha) {
  return Git.Commit.lookup(repo, cherrypickSha).then(cherrypickCommit => {
    return Git.Cherrypick
      .cherrypick(repo, cherrypickCommit, {})
      .then(() => repo.index())
      .then(index => index.writeTree())
      .then(oid => {
        return repo.getHeadCommit().then(parent => {
          return repo.createCommit(
            'HEAD',
            cherrypickCommit.author(),
            cherrypickCommit.committer(),
            cherrypickCommit.message(),
            oid,
            [parent]
          );
        });
      });
  });
}

function checkout(repo) {
  return repo
    .getBranchCommit(`refs/remotes/origin/${branchName}`)
    .then(reference => {
      debugger;
      return repo.checkoutRef(reference);
    });
}
