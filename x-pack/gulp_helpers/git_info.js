/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const path = require('path');
const simpleGit = require('simple-git');
const gitDir = path.resolve(__dirname, '..');

function gitInfo() {
  const git = simpleGit(gitDir);

  return new Promise((resolve, reject) => {
    git.log((err, log) => {
      if (err) return reject(err);
      resolve({
        number: log.total,
        sha: log.latest.hash,
      });
    });
  });
}

module.exports = gitInfo;