module.exports = function (grunt) {
  var _ = require('lodash');
  var Promise = require('bluebird');
  var readFileAsync = Promise.promisify(require('fs').readFile);
  var spawnAsync = Promise.promisify(grunt.util.spawn);
  var path = require('path');
  var absolute = _.partial(path.join, path.join(__dirname, '..'));

  var TODO_RE = /[\s\/\*]+(TODO|FIXME):?\s*(.+)/;
  var NEWLINE_RE = /\r?\n/;
  var TODO_FILENAME = 'TODOS.md';
  var TYPE_PRIORITIES = {
    'FIXME': 1
  };

  grunt.registerTask('todos', function () {
    var files = grunt.file.expand([
      'src/kibana/**/*.js',
      'test/unit/specs/**/*.js'
    ]);
    var matches = [];

    var currentFile = null;
    if (grunt.file.exists(TODO_FILENAME)) {
      currentFile = grunt.file.read(TODO_FILENAME);
    }

    Promise.map(files, function (path) {
      // grunt passes back these file names relative to the root... not
      // what we want when we are calling fs.readFile
      var absPath = absolute(path);

      return readFileAsync(absPath, 'utf8')
      .then(function (file) {
        return file.split(NEWLINE_RE);
      })
      .each(function (line, i) {
        var match = line.match(TODO_RE);
        if (!match) return;

        matches.push({
          type: match[1],
          msg: match[2],
          path: path,
          line: i + 1
        });
      });
    }, { concurrency: 50 })
    .then(function () {
      var newFileLines = [
        '# TODO items',
        '> Automatically extracted',
        ''
      ];

      var groupedByPath = _.groupBy(matches, 'path');

      Object.keys(groupedByPath)
      .sort(function (a, b) {
        var aChunks = a.split(path.sep);
        var bChunks = b.split(path.sep);

        // compare the paths chunk by chunk
        for (var i = 0; i < aChunks.length; i++) {
          if (aChunks[i] === bChunks[i]) continue;
          return aChunks[i].localeCompare(bChunks[i] || '');
        }
      })
      .forEach(function (path) {
        newFileLines.push(' - **' + path + '**');

        _(groupedByPath[path])
        .sortBy(function (match) {
          return TYPE_PRIORITIES[match.type] || 0;
        })
        .each(function (match) {
          var priority = TYPE_PRIORITIES[match.type] || 0;

          newFileLines.push(
            '   - ' + (priority ? match.type + ' – ' : '') +
            match.msg + ' – ' +
            '(https://github.com/elasticsearch/kibana4/blob/master/' + match.path + ')'
          );
        });
      });

      var newFile = newFileLines.join('\n');

      if (newFile !== currentFile) {
        grunt.log.ok('Committing updated TODO.md');
        grunt.file.write(TODO_FILENAME, newFile);
        return spawnAsync({
          cmd: 'git',
          args: ['add', absolute(TODO_FILENAME)]
        });
      } else {
        grunt.log.ok('No changes to commit to TODO.md');
      }
    })
    .nodeify(this.async());
  });
};