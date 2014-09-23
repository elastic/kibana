var marked = require('marked');
var Promise = require('bluebird');
var join = require('path').join;
var TextRenderer = require('marked-text-renderer');
var _ = require('lodash');
var fs = require('fs');
var entities = new (require('html-entities').AllHtmlEntities)();

var readFile = Promise.promisify(fs.readFile);
var writeFile = Promise.promisify(fs.writeFile);

TextRenderer.prototype.heading = function (text, level, raw) {
  return '\n\n' + text + '\n' + _.map(text, function () { return '='; }).join('') + '\n';
};

var process = function (input) {
  var output = input.replace(/<\!\-\- [^\-]+ \-\->/g, '\n');
  output = marked(output);
  return entities.decode(output);
};

module.exports = function (grunt) {

  grunt.registerTask('compile_dist_readme', function () {
    var done = this.async();
    var root = grunt.config.get('root');
    var build = grunt.config.get('build');

    var srcReadme =  join(root, 'README.md');
    var distReadme = join(build, 'dist', 'kibana', 'README.txt');

    var srcLicense =  join(root, 'LICENSE.md');
    var distLicense = join(build, 'dist', 'kibana', 'LICENSE.txt');

    marked.setOptions({
      renderer: new TextRenderer(),
      tables: true,
      breaks: false,
      pedantic: false,
      sanitize: false,
      smartLists: true,
      smartypants: false
    });

    readFile(srcReadme, 'utf-8')
    .then(function (data) {
      return writeFile(distReadme, process(data.toString()));
    })
    .then(function () {
      return readFile(srcLicense, 'utf-8');
    })
    .then(function (data) {
      return writeFile(distLicense, process(data.toString()));
    })
    .then(done)
    .catch(done);

  });

};
