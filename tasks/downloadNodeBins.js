module.exports = function (grunt) {
  grunt.registerTask('downloadNodeBins', function () {
    let { map, fromNode, promisify } = require('bluebird');
    let { resolve } = require('path');
    let { createWriteStream } = require('fs');
    let { createGunzip } = require('zlib');
    let { Extract } = require('tar');

    let mkdirp = promisify(require('mkdirp'));
    let rename = promisify(require('fs').rename);
    let get = (uri) => fromNode(cb => require('wreck').request('GET', uri, null, cb));

    let exists = (path) => fromNode(cb => {
      require('fs').stat(path, err => cb(null, !err));
    });

    let platforms = grunt.config.get('platforms');
    let nodeVersion = grunt.config.get('nodeVersion');

    let nodeDir = require('requirefrom')('src/utils')('fromRoot')(`.node_binaries/${nodeVersion}`);
    let baseUri = `https://iojs.org/dist/v${nodeVersion}`;

    let writeTar = async (to, from) => {
      await fromNode(cb => {
        from
        .pipe(createGunzip())
        .on('error', cb)
        .pipe(new Extract({ path: to, strip: 1 }))
        .on('error', cb)
        .on('end', cb);
      });
    };

    let writeExe = async (to, from) => {
      let winBinDir = resolve(to, 'bin');
      await mkdirp(winBinDir);
      await fromNode(cb => {
        from
        .pipe(createWriteStream(resolve(winBinDir, 'node.exe')))
        .on('error', cb)
        .on('finish', cb);
      });
    };

    mkdirp(nodeDir)
    .then(function () {
      grunt.log.ok(`downloading node binaries for ${platforms.join(', ')}`);
      return platforms;
    })
    .map(async function (platform) {
      let finalDir = resolve(nodeDir, `${platform}`);
      let downloadDir = `${finalDir}.temp`;

      if (await exists(finalDir)) {
        grunt.log.ok(`${platform} download exists`);
        return;
      }

      let uri;
      if (platform === 'windows') {
        uri = `${baseUri}/win-x64/iojs.exe`;
      } else {
        uri = `${baseUri}/iojs-v${nodeVersion}-${platform}.tar.gz`;
      }

      let resp = await get('GET', uri);
      if (resp.statusCode !== 200) {
        throw new Error(uri + ' failed with a ' + resp.statusCode);
      }

      let write = platform === 'windows' ? writeExe : writeTar;
      await write(downloadDir, resp);
      await rename(downloadDir, finalDir);

      grunt.log.ok(`${platform} download complete`);
    })
    .nodeify(this.async());
  });
};

