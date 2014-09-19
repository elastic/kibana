module.exports = function (grunt) {
  var expect = require('expect.js');
  var root = require('path').join.bind(null, __dirname, '../');

  var README = root('README.md');
  var RE_COMMENT = /<!--(.+?)-->/g;

  var tags = {
    render: function (args) {
      return grunt.config.process(args.template);
    },
    include: function (args) {
      return grunt.file.read(args.path);
    }
  };

  grunt.registerTask('render_readme', function () {
    var input = grunt.file.read(README);
    var chunks = [];

    var comments = findAndParseComments(input);


    for (var i = 0; i < comments.length; i += 2) {
      var open = comments[i];
      var close = comments[i + 1];

      expect(close.tag).to.be('/' + open.tag);

      if (!tags[open.tag]) {
        throw new TypeError('unkown tag name ' + open.tag);
      }

      chunks.push(input.substring(open.i0, open.i1));
      chunks.push('\n' + tags[open.tag](open.args).trim() + '\n');
      chunks.push(input.substring(close.i0, close.i1));

      // add the text between this and the next tag
      if (comments.length > i + 2) {
        var next = comments[i + 2];
        chunks.push(input.substring(close.i1, next.i0));
      }
    }

    var output = chunks.join('');
    if (output === input) {
      grunt.log.ok('no update to the readme');
      return;
    }

    grunt.log.ok('readme updated and added to git');
    grunt.file.write(README, output);
    grunt.util.spawn({
      cmd: 'git',
      args: ['add', README]
    }, this.async());
  });

  function findAndParseComments(input) {
    var comments = [];
    var match;
    var comment;

    while (match = RE_COMMENT.exec(input)) {
      var parts = match[1].trim().split(/\s+/);
      comment = {
        tag: parts.shift().trim(),
        args: parts.join(' ').trim(),
        i0: match.index,
        i1: match.index + match[0].length
      };

      if (comment.args) {
        comment.args = JSON.parse(comment.args);
      } else {
        comment.args = null;
      }

      comments.push(comment);
    }

    return comments;
  }
};
