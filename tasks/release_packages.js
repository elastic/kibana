import exec from './utils/exec';
import SimpleGit from 'simple-git';
import { promisify } from 'bluebird';
import readline from 'readline';

export default (grunt) => {
  const packages = grunt.config.get('packages');
  const platforms = grunt.config.get('platforms');

  function debS3(deb) {
    exec('deb-s3', [
      'upload',
      '--preserve-versions',
      deb.filePath,
      '--bucket', deb.bucket,
      '--prefix', deb.prefix,
      '--sign', deb.signatureKeyId,
      '--arch', deb.arch,
      `--access-key-id=${deb.awsKey}`,
      `--secret-access-key=${deb.awsSecret}`
    ]);
  }

  function rpmS3(rpm) {
    exec('rpm', [
      '--resign', rpm.filePath,
      '--define', '_signature gpg',
      '--define', `_gpg_name ${rpm.signingKeyName}`
    ]);

    exec('rpm-s3', [
      '-v',
      '-b', rpm.bucket,
      '-p', rpm.prefix,
      '--sign',
      '--visibility', 'public-read',
      '-k', '100',
      rpm.filePath,
      '-r', 'external-1'
    ]);
  }

  grunt.registerTask('publish:staging', [
    '_publish:confirm',
    '_publish:packages:staging',
  ]);

  grunt.registerTask('publish:production', [
    '_publish:confirm',
    '_publish:packages:production',
  ]);

  grunt.registerTask('_publish:confirm', function () {
    function abort() {
      grunt.fail.fatal('Aborting publish');
    }

    var rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    rl.on('close', this.async());
    rl.on('SIGINT', () => abort());
    rl.question('Publish packages to s3? [N/y] ', function (resp) {
      if (resp.toLowerCase().trim()[0] === 'y') return rl.close();
      abort();
    });
  });

  grunt.registerTask('_publish:packages', function (environment) {
    const done = this.async();
    const aws = grunt.file.readJSON('.aws-config.json');
    const simpleGit = new SimpleGit();
    const revparse = promisify(simpleGit.revparse, simpleGit);

    return revparse(['--short', 'HEAD'])
    .then(hash => {
      const trimmedHash = hash.trim();
      platforms.forEach((platform) => {
        if (platform.debPath) {
          debS3({
            filePath: platform.debPath,
            bucket: packages[environment].bucket,
            prefix: packages[environment].debPrefix.replace('XXXXXXX', trimmedHash),
            signatureKeyId: packages.signingKeyId,
            arch: platform.name.match('x64') ? 'amd64' : 'i386',
            awsKey: aws.key,
            awsSecret: aws.secret
          });
        }

        if (platform.rpmPath) {
          rpmS3({
            filePath: platform.rpmPath,
            bucket: packages[environment].bucket,
            prefix: packages[environment].rpmPrefix.replace('XXXXXXX', trimmedHash),
            signingKeyName: packages.signingKeyName
          });
        }
      });
    });
  });
};
