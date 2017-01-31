const sass = require('node-sass');
const postcss = require('postcss');
const postcssConfig = require('../src/optimize/postcss.config');
const chokidar = require('chokidar');
const debounce = require('lodash/function/debounce');
const platform = require('os').platform();
const promisify = require('bluebird').promisify;
const Handlebars = require('handlebars');
const fs = require('fs');
const path = require('path');

const readDirAsync = promisify(fs.readdir);
const readFileAsync = promisify(fs.readFile);
const writeFileAsync = promisify(fs.writeFile);

module.exports = function (grunt) {
  grunt.registerTask('uiFramework:start', function () {
    const done = this.async();
    Promise.all([
      watchCssSource(),
      watchDocumentationSource(),
      startServer(),
    ]).then(done);
  });

  function startServer() {
    const serverCmd = {
      cmd: /^win/.test(platform)
        ? '.\\node_modules\\.bin\\webpack-dev-server.cmd'
        : './node_modules/.bin/webpack-dev-server',
      args: [
        '--config=ui_framework/doc_site/webpack.config.js',
        '--hot ',
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

  function buildStaticPages() {
    const STATIC_PAGES_DIR = path.resolve('ui_framework/doc_site/src/static_pages');
    const STATIC_PAGES_BUILD_DIR = path.resolve('ui_framework/doc_site/build/static_pages');
    const layoutFile = path.resolve(STATIC_PAGES_DIR, 'partials/layout.handlebars');

    // Clear and rebuild directory.
    function deleteStaticPagesBuildDir() {
      if (fs.existsSync(STATIC_PAGES_BUILD_DIR)) {
        const files = fs.readdirSync(STATIC_PAGES_BUILD_DIR);

        files.forEach((file, index) => {
          const filePath = path.resolve(STATIC_PAGES_BUILD_DIR, file);

          if (fs.lstatSync(filePath).isDirectory()) {
            deleteStaticPagesBuildDir(filePath);
          } else {
            fs.unlinkSync(filePath);
          }
        });

        fs.rmdirSync(STATIC_PAGES_BUILD_DIR);
      }
    }

    deleteStaticPagesBuildDir();
    fs.mkdirSync(STATIC_PAGES_BUILD_DIR);

    readFileAsync(layoutFile, 'utf8').then(layout => {
      const layoutTemplate = Handlebars.compile(layout, {
        noEscape: true,
      });

      readDirAsync(STATIC_PAGES_DIR).then(contents => {
        const staticPages = contents.filter(fileName => fileName.indexOf('.html') !== -1);

        staticPages.forEach(staticPage => {
          const src = path.resolve(STATIC_PAGES_DIR, staticPage);
          const dest = path.resolve(STATIC_PAGES_BUILD_DIR, staticPage);
          readFileAsync(src, 'utf8').then(fileContents => {
            const html = layoutTemplate({
              body: fileContents,
            });
            writeFileAsync(dest, html);
          });
        });
      });
    });
  }

  function watchDocumentationSource() {
    const debouncedBuildStaticPages = debounce(buildStaticPages, 400, { leading: true });

    return new Promise((resolve, reject) => {
      debouncedBuildStaticPages();

      chokidar.watch('ui_framework/doc_site/src', {
        ignoreInitial: true,
      }).on('all', (event, path) => {
        grunt.log.writeln(event, path);
        debouncedBuildStaticPages();
      });
    });
  }

  function compileCss() {
    sass.render({
      file: 'ui_framework/components/index.scss'
    }, function (error, result) {
      if (error) {
        grunt.log.error(error);
      }

      postcss([postcssConfig])
        .process(result.css, {
          from: 'ui_framework/components/index.scss',
          to: 'ui_framework/dist/ui_framework.css',
        }).then(result => {
          grunt.file.write('ui_framework/dist/ui_framework.css', result.css);

          if (result.map) {
            grunt.file.write('ui_framework/dist/ui_framework.css.map', result.map);
          }
        });
    });
  }

  function watchCssSource() {
    const debouncedCompileCss = debounce(compileCss, 400, { leading: true });

    return new Promise((resolve, reject) => {
      debouncedCompileCss();

      chokidar.watch('ui_framework/components', {
        ignoreInitial: true,
      }).on('all', (event, path) => {
        grunt.log.writeln(event, path);
        debouncedCompileCss();
      });
    });
  }
};
