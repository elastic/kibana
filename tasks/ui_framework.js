import sass from 'node-sass';
import postcss from 'postcss';
import postcssConfig from '../src/optimize/postcss.config';
import chokidar from 'chokidar';
import debounce from 'lodash/function/debounce';

const platform = require('os').platform();
const isPlatformWindows = /^win/.test(platform);

module.exports = function (grunt) {
  grunt.registerTask('uiFramework:build', function () {
    const done = this.async();

    const serverCmd = {
      cmd: isPlatformWindows ? '.\\node_modules\\.bin\\webpack.cmd' : './node_modules/.bin/webpack',
      args: [
        '-p',
        '--config=ui_framework/doc_site/webpack.config.js',
        '--devtool=null', // Prevent the source map from being generated
      ],
      opts: { stdio: 'inherit' }
    };

    const uiFrameworkServerBuild = new Promise((resolve, reject) => {
      grunt.util.spawn(serverCmd, (error, result, code) => {
        if (error || code !== 0) {
          const message = result.stderr || result.stdout;

          grunt.log.error(message);

          return reject();
        }

        grunt.log.writeln(result);

        resolve();
      });
    });

    uiFrameworkServerBuild.then(done);
  });

  grunt.registerTask('uiFramework:start', function () {
    const done = this.async();
    Promise.all([uiFrameworkWatch(), uiFrameworkServerStart()]).then(done);
  });

  grunt.registerTask('uiFramework:compileCss', function () {
    const done = this.async();
    uiFrameworkCompile().then(done);
  });

  function uiFrameworkServerStart() {
    const serverCmd = {
      cmd: isPlatformWindows ? '.\\node_modules\\.bin\\webpack-dev-server.cmd' : './node_modules/.bin/webpack-dev-server',
      args: [
        '--config=ui_framework/doc_site/webpack.config.js',
        '--hot',
        '--inline',
        '--content-base=ui_framework/doc_site/build',
        '--host=0.0.0.0',
        '--port=8020',
      ],
      opts: { stdio: 'inherit' }
    };

    return new Promise((resolve, reject) => {
      grunt.util.spawn(serverCmd, (error, result, code) => {
        if (error || code !== 0) {
          const message = result.stderr || result.stdout;

          grunt.log.error(message);

          return reject();
        }

        grunt.log.writeln(result);

        resolve();
      });

    });
  }

  function uiFrameworkCompile() {
    const src = 'ui_framework/src/index.scss';
    const dest = 'ui_framework/dist/ui_framework.css';

    return new Promise(resolve => {
      sass.render({
        file: src,
      }, function (error, result) {
        if (error) {
          grunt.log.error(error);
        }

        postcss([postcssConfig])
          .process(result.css, { from: src, to: dest })
          .then(result => {
            grunt.file.write(dest, result.css);

            if (result.map) {
              grunt.file.write(`${dest}.map`, result.map);
            }

            resolve();
          });
      });
    });
  }

  function uiFrameworkWatch() {
    const debouncedCompile = debounce(() => {
      // Compile the SCSS in a separate process because node-sass throws a fatal error if it fails
      // to compile.
      grunt.util.spawn({
        cmd: isPlatformWindows ? '.\\node_modules\\.bin\\grunt.cmd' : './node_modules/.bin/grunt',
        args: [
          'uiFramework:compileCss',
        ],
      }, (error, result) => {
        if (error) {
          grunt.log.error(result.stdout);
        } else {
          grunt.log.writeln(result);
        }
      });
    }, 400, { leading: true });

    return new Promise(() => {
      debouncedCompile();

      chokidar.watch('ui_framework/src', { ignoreInitial: true }).on('all', (event, path) => {
        grunt.log.writeln(event, path);
        debouncedCompile();
      });
    });
  }
};
