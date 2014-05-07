var Promise = require('bluebird');
var grunt = require('grunt');
var estream = require('event-stream');
var cp = require('child_process');

// create a function that will spawn another process based on the args when called
module.exports = function (cmd, args, cwd) {
  return function () {
    var defer = Promise.defer();
    var opts = {
      stdio: 'pipe',
      cwd: cwd
    };

    var endsWithNlRE = /\n\r?$/;

    grunt.log.writeln('$ ' + cmd + ' ' + args.join(' ') + (opts.cwd ? ' in ' + opts.cwd : ''));
    var childProc = cp.spawn(cmd, args, opts);

    // track when we are in a series of empty lines, and use this info to limit empty lines to one
    var empty = 0;
    var maxEmpty = 1;

    ['stdout', 'stderr'].forEach(function (stream) {
      childProc[stream]
        .pipe(estream.split())
        .pipe(
          estream.map(function (line, cb) {
            if (!line) { empty ++; if (empty > maxEmpty) return; }
            else empty = 0;

            cb(null, '  ' + line + '\n');
          })
        )
        .pipe(process[stream]);
    });

    childProc.on('close', function (code) {
      if (code > 0) defer.reject('Process exitted with non-zero code ' + code);
      else defer.resolve();
    });

    return defer.promise;
  };
};