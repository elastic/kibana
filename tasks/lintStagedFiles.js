var _ = require('lodash');
var resolve = require('path').resolve;
var root = resolve(__dirname, '..');
var simpleGit = require('simple-git')(root);
var diff = require('bluebird').promisify(simpleGit.diff, simpleGit);

module.exports = function (grunt) {

  grunt.registerTask(
    'lintStagedFiles',
    'Run staged files through JSHint/JSCS',
    function () {

      diff(['--name-only', '--cached'])
      .then(function (files) {
        // match these patterns
        var patterns = grunt.config.get('lintThese');
        files = files.split('\n').filter(Boolean).map(function (file) {
          return resolve(root, file);
        });

        files = grunt.file.match(patterns, files);
        grunt.log.debug(files);

        if (!_.size(files)) return;
        grunt.config.set('eslint.staged.files.src', files);
        grunt.task.run(['eslint:staged']);
      })
      .nodeify(this.async());

    }
  );
};

