module.exports = function (grunt) {
  let { map, fromNode } = require('bluebird');
  let { resolve } = require('path');
  let { pluck } = require('lodash');
  let { createWriteStream } = require('fs');
  let { createGunzip } = require('zlib');
  let { Extract } = require('tar');
  let { rename } = require('fs');
  let wreck = require('wreck');

  let platforms = grunt.config.get('platforms');
  let activeDownloads = [];

  let start = async (platform) => {
    let finalDir = platform.nodeDir;
    let downloadDir = `${finalDir}.temp`;

    if (grunt.file.isDir(platform.nodeDir)) {
      grunt.log.ok(`${platform.name} exists`);
      return;
    }

    let resp = await fromNode(cb => {
      let req = wreck.request('GET', platform.nodeUrl, null, function (err, resp) {
        if (err) {
          return cb(err);
        }

        if (resp.statusCode !== 200) {
          return cb(new Error(`${platform.nodeUrl} failed with a ${resp.statusCode} response`));
        }

        return cb(null, resp);
      });
    });

    // use an async iife to store promise for download
    // then store platform in active downloads list
    // which we will read from in the finish task
    platform.downloadPromise = (async function () {
      grunt.file.mkdir(downloadDir);

      if (platform.name === 'windows') {
        await fromNode(cb => {
          resp
          .pipe(createWriteStream(resolve(downloadDir, 'node.exe')))
          .on('error', cb)
          .on('finish', cb);
        });
      } else {
        await fromNode(cb => {
          resp
          .pipe(createGunzip())
          .on('error', cb)
          .pipe(new Extract({ path: downloadDir, strip: 1 }))
          .on('error', cb)
          .on('end', cb);
        });
      }

      await fromNode(cb => {
        rename(downloadDir, finalDir, cb);
      });
    }());

    activeDownloads.push(platform);

    var bytes = parseInt(resp.headers['content-length'], 10) || 'unknown number of';
    var mb = ((bytes / 1024) / 1024).toFixed(2);
    grunt.log.ok(`downloading ${platform.name} - ${mb} mb`);
  };

  grunt.registerTask('_build:downloadNodeBuilds:start', function () {
    map(platforms, start).nodeify(this.async());
  });

  grunt.registerTask('_build:downloadNodeBuilds:finish', function () {
    map(activeDownloads, async (platform) => {
      await platform.downloadPromise;
      grunt.log.ok(`${platform.name} download complete`);
    })
    .nodeify(this.async());
  });
};
