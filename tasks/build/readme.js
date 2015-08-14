let marked = require('marked');
let Promise = require('bluebird');
let { join } = require('path');
let TextRenderer = require('marked-text-renderer');
let _ = require('lodash');
let fs = require('fs');
let { AllHtmlEntities } = require('html-entities');
let entities = new AllHtmlEntities();

TextRenderer.prototype.heading = function (text, level, raw) {
  return '\n\n' + text + '\n' + _.map(text, function () { return '='; }).join('') + '\n';
};

module.exports = function (grunt) {

  grunt.registerTask('_build:readme', function () {
    let transform = function (input) {
      let output = input.replace(/<\!\-\- [^\-]+ \-\->/g, '\n');
      output = marked(output);
      return entities.decode(output);
    };

    marked.setOptions({
      renderer: new TextRenderer(),
      tables: true,
      breaks: false,
      pedantic: false,
      sanitize: false,
      smartLists: true,
      smartypants: false
    });

    grunt.file.write('build/kibana/README.txt', transform(grunt.file.read('README.md')));
    grunt.file.write('build/kibana/LICENSE.txt', transform(grunt.file.read('LICENSE.md')));
  });

};
