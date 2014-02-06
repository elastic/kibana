module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    meta: {
      banner: '/*! <%= pkg.name %> - v<%= pkg.version %> */ ',
      falafelStart: '(function(require,module){',
      falafelEnd: 'window.falafel = module.exports;})(function(){return {parse: esprima.parse};},{exports: {}});',
      esprimaStart: '(function(define){',
      esprimaEnd: '})(null);<%= "" %>',
    },
    blanketTest: {
      normal:{
        node: "<%= cmds.mocha %> <%= runners.node %>",
        nodeCS: "<%= cmds.mochaCS %> <%= runners.nodeCS %>",
        browser: "<%= cmds.phantom %> <%= phantom.qunit %> <%= runners.browser %>",
        browserRequire: "<%= cmds.phantom %> <%= phantom.qunit %> <%= runners.browserRequire %>",
        browserBackbone: "<%= cmds.phantom %> <%= phantom.qunit %> <%= runners.browserBackbone %>",
        browserReporter: "<%= cmds.phantom %> <%= phantom.qunit %> <%= runners.browserReporter %>",
        browserJasmine: "<%= cmds.phantom %> <%= phantom.jasmine %> <%= runners.browserJasmine %>",
        browserJasmineBuild: "<%= cmds.phantom %> <%= phantom.jasmine %> <%= runners.browserJasmineBuild %>",
        browserJasmineAdapter: "<%= cmds.phantom %> <%= phantom.jasmine %> <%= runners.browserJasmineAdapter %>",
        browserJasmineAdapterArray: "<%= cmds.phantom %> <%= phantom.jasmine %> <%= runners.browserJasmineAdapterArray %>",
        browserJasmineAdapterRegex: "<%= cmds.phantom %> <%= phantom.jasmine %> <%= runners.browserJasmineAdapterRegex %>",
        browserMochaAdapter: "<%= cmds.phantom %> <%= phantom.mocha %> <%= runners.browserMochaAdapter %>",
        browserBootstrap: "<%= cmds.phantom %> <%= phantom.qunit_old %> <%= runners.browserBootstrap %>",
        browserCoffeeScript: "<%= cmds.phantom %> <%= phantom.qunit %> <%= runners.browserCoffeeScript %>",
        browserJasmineRequire: "<%= cmds.phantom %> <%= phantom.jasmine %> <%= runners.browserJasmineRequire %>",
        //browserChutzpah: "<%= cmds.phantom %> <%= phantom.qunit %> <%= runners.browserChutzpah %>",
        browserCommonjs: "<%= cmds.phantom %> <%= phantom.qunit %> <%= runners.browserCommonjs %>"
      },
      coverage:{
        node: "<%= cmds.mocha %> --reporter <%= reporters.mocha.node %> <%= runners.node %>",
        browser: "<%= cmds.phantom %> <%= reporters.qunit %> <%= runners.browser %> 80",
        browserRequire: "<%= cmds.phantom %> <%= reporters.qunit %> <%= runners.browserRequire %> 80",
        browserReporter: "<%= cmds.phantom %> <%= reporters.qunit %> <%= runners.browserReporter %> 80",
        browserJasmine: "<%= cmds.phantom %> <%= reporters.jasmine %> <%= runners.browserJasmine %> 80",
        browserJasmineBuild: "<%= cmds.phantom %> <%= reporters.jasmine %> <%= runners.browserJasmineBuild %> 80",
        browserJasmineAdapter: "<%= cmds.phantom %> <%= reporters.jasmine %> <%= runners.browserJasmineAdapter %> 80",
        browserMochaAdapter: "<%= cmds.phantom %> <%= reporters.mocha.browser %> <%= runners.browserMochaAdapter %> 80"
      }
    },
    concat: {
      qunit: {
        src: ['<banner>',
              'src/qunit/noautorun.js',
              '<banner:meta.esprimaStart>',
              'node_modules/esprima/esprima.js',
              '<banner:meta.esprimaEnd>',
              '<banner:meta.falafelStart>',
              'node_modules/falafel/index.js',
              '<banner:meta.falafelEnd>',
              'src/blanket.js',
              'src/blanket_browser.js',
              "src/qunit/reporter.js",
              "src/config.js",
              "src/blanketRequire.js",
              "src/qunit/qunit.js"],
        dest: 'dist/qunit/blanket.js'
      },
      jasmine: {
        src: ['<banner>',
               '<banner:meta.esprimaStart>',
              'node_modules/esprima/esprima.js',
              '<banner:meta.esprimaEnd>',
              '<banner:meta.falafelStart>',
              'node_modules/falafel/index.js',
              '<banner:meta.falafelEnd>',
              'src/blanket.js',
              'src/blanket_browser.js',
              "src/qunit/reporter.js",
              "src/config.js",
              "src/blanketRequire.js",
              "src/adapters/jasmine-blanket.js"],
        dest: 'dist/jasmine/blanket_jasmine.js'
      }
    },
    min: {
      qunit: {
        src: ['dist/qunit/blanket.js'],
        dest: 'dist/qunit/blanket.min.js'
      },
      jasmine: {
        src: ['dist/jasmine/blanket_jasmine.js'],
        dest: 'dist/jasmine/blanket_jasmine.min.js'
      }
    },
    uglify:{
      codegen: {
        ascii_only: true
      }
    },
    lint: {
      files: [
      'grunt.js',
      'src/*.js',
      'src/qunit/*.js',
      'src/reporters/*.js',
      'src/adapters/*.js',
      'src/loaders/*.js',
      'test/*.js',
      'test-node/*.js']
    },
    watch: {
      files: '<config:lint.files>',
      tasks: 'default'
    },
    jshint: {
      options: {
        curly: true,
        eqeqeq: true,
        immed: false,
        latedef: true,
        newcap: true,
        noarg: true,
        sub: true,
        undef: false,
        boss: true,
        strict:false,
        eqnull: true,
        node: true,
        browser: true,
        es5: true,
        expr: "warn"
      },
      globals: {}
    }
  });

  // Load local tasks.
  grunt.loadTasks('tasks');

  // Default task.
  grunt.registerTask('default', 'buildit blanketTest');
  grunt.registerTask('buildit','lint concat min');
  grunt.registerTask('blanket', 'buildit blanketTest:normal');
  grunt.registerTask('blanket-coverage', 'buildit blanketTest:coverage');

};
