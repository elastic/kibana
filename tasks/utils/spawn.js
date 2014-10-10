var Promise = require('bluebird');
var grunt = require('grunt');
var estream = require('event-stream');
var cp = require('child_process');
var path = require('path');

// create a function that will spawn another process based on the args when called
module.exports = function (cmd, args, cwd, silent) {
  return function () {
    var defer = Promise.defer();
    var opts = {
      stdio: 'pipe',
      cwd: cwd || path.join(__dirname, '../..')
    };

    var endsWithNlRE = /\n\r?$/;
    var relDir = opts.cwd ? path.relative(process.cwd(), opts.cwd) + ' ' : '';
    if (!silent) grunt.log.writeln(relDir + '$ ' + cmd + ' ' + args.join(' '));
    var childProc = cp.spawn(cmd, args, opts);

    // track when we are in a series of empty lines, and use this info to limit empty lines to one
    var empty = 0;
    var maxEmpty = 1;

    var buffer = '';

    ['stdout', 'stderr'].forEach(function (stream) {
      var out = childProc[stream]
        .pipe(estream.split())
        .pipe(
          estream.map(function (line, cb) {
            if (!line) { empty ++; if (empty > maxEmpty) return; }
            else empty = 0;

            buffer += line + '\n';
            cb(null, '  ' + line + '\n');
          })
        );

      if (!silent) {
        out.pipe(process[stream]);
      }
    });

    childProc.on('close', function (code) {
      if (code > 0) {
        var err = new Error('Process exitted with non-zero code ' + code);
        err.outpur = buffer;
        defer.reject(err);
      }
      else defer.resolve(buffer);
    });

    return defer.promise;
  };
};

module.exports.silent = function (cmd, args, cwd) {
  return module.exports(cmd, args, cwd, true);
};