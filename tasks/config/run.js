module.exports = function (grunt) {
  let {resolve} = require('path');
  let root = p => resolve(__dirname, '../../', p);

  return {
    devServer: {
      options: {
        wait: false,
        ready: /Server running/,
        quiet: false,
        failOnError: false
      },
      cmd: './bin/kibana',
      args: ['--dev', '--no-watch', '--logging.json=false']
    },

    eslint: {
      cmd: root('node_modules/.bin/eslint'),
      args: ['Gruntfile.js', 'src/', 'tasks/', '--ignore-path', root('.eslintignore'), '--color']
    },

    eslintStaged: {
      cmd: root('node_modules/.bin/eslint'),
      args: ['--ignore-path', root('.eslintignore'), '--color']
    }
  };

};
