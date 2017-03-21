import { Promise, map, promisify } from 'bluebird';
import { resolve, basename, dirname, join } from 'path';
import { createReadStream, writeFile } from 'fs';
import { createGunzip } from 'zlib';
import { Extract } from 'tar';
import { fromFile } from 'check-hash';
import wreck from 'wreck';
import { mkdirp } from 'mkdirp';

const mkdirpAsync = promisify(mkdirp);
const wreckGetAsync = promisify(wreck.get, wreck);
const checkHashFromFileAsync = promisify(fromFile);
const writeFileAsync = promisify(writeFile);

export default function downloadNodeBuilds(grunt) {
  const platforms = grunt.config.get('platforms');
  const downloadLimit = 3;

  const shaSums = {};
  const getShaSums = () => {
    const nodeVersion = grunt.config.get('nodeVersion');
    const shaSumsUri = `https://nodejs.org/dist/v${nodeVersion}/SHASUMS256.txt`;

    return wreckGetAsync(shaSumsUri).then(([resp, payload]) => {
      if (resp.statusCode !== 200) {
        throw new Error(`${shaSumsUri} failed with a ${resp.statusCode} response`);
      }
      payload
      .toString('utf8')
      .split('\n')
      .forEach(line => {
        const [sha, platform] = line.split('  ');
        shaSums[platform] = sha;
      });
    });
  };

  const checkShaSum = (platform) => {
    const file = basename(platform.nodeUrl);
    const downloadDir = join(platform.nodeDir, '..');
    const filePath = resolve(downloadDir, file);
    const expected = {
      hash: 'sha256',
      expected: platform.win ? shaSums[basename(dirname(platform.nodeUrl)) + '/' + file] : shaSums[file]
    };

    if (!grunt.file.isFile(filePath)) {
      return false;
    }

    return checkHashFromFileAsync(filePath, expected).then(([passed]) => {
      if (!passed) {
        grunt.log.error(`${platform.name} shasum check failed`);
      }
      return passed;
    });
  };

  const getNodeBuild = (platform) => {
    const downloadDir = join(platform.nodeDir, '..');
    const file = basename(platform.nodeUrl);
    const filePath = resolve(downloadDir, file);

    if (grunt.file.isFile(filePath)) {
      grunt.file.delete(filePath);
    }

    return wreckGetAsync(platform.nodeUrl)
    .then(([resp, payload]) => {
      if (resp.statusCode !== 200) {
        throw new Error(`${platform.nodeUrl} failed with a ${resp.statusCode} response`);
      }
      return payload;
    })
    .then(payload => writeFileAsync(filePath, payload));

  };

  const start = async (platform) => {
    const downloadDir = join(platform.nodeDir, '..');
    let downloadCounter = 0;
    let isDownloadValid = false;

    await mkdirpAsync(downloadDir);
    if (grunt.option('skip-node-download')) {
      grunt.log.ok(`Verifying sha sum of ${platform.name}`);
      isDownloadValid = await checkShaSum(platform);
      if (!isDownloadValid) {
        throw new Error(`${platform.name} sha verification failed.`);
      }
      return;
    }

    while (!isDownloadValid && (downloadCounter < downloadLimit)) {
      grunt.log.ok(`Downloading ${platform.name} and corresponding sha`);
      await getNodeBuild(platform);
      isDownloadValid = await checkShaSum(platform);
      ++downloadCounter;
    }

    if (!isDownloadValid) {
      throw new Error(`${platform.name} download failed`);
    }

    grunt.log.ok(`${platform.name} downloaded and verified`);
  };

  grunt.registerTask('_build:downloadNodeBuilds', function () {
    const done = this.async();
    getShaSums()
    .then(() => map(platforms, start))
    .nodeify(done);
  });

  const extractNodeBuild = async (platform) => {
    const file = basename(platform.nodeUrl);
    const downloadDir = join(platform.nodeDir, '..');
    const filePath = resolve(downloadDir, file);

    return new Promise((resolve, reject) => {
      createReadStream(filePath)
        .pipe(createGunzip())
        .on('error', reject)
        .pipe(new Extract({ path: platform.nodeDir, strip: 1 }))
        .on('error', reject)
        .on('end', resolve);
    });
  };

  const extract = async(platform) => {
    const file = basename(platform.nodeUrl);
    const downloadDir = join(platform.nodeDir, '..');
    const filePath = resolve(downloadDir, file);

    if (grunt.file.isDir(platform.nodeDir)) {
      grunt.file.delete(platform.nodeDir);
    }

    if (platform.win) {
      grunt.file.mkdir(platform.nodeDir);
      grunt.file.copy(filePath, resolve(platform.nodeDir, file));
    } else {
      await extractNodeBuild(platform);
    }
  };

  grunt.registerTask('_build:extractNodeBuilds', function () {
    map(platforms, extract).nodeify(this.async());
  });

}
