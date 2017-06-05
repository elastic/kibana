import exec from './utils/exec';
import readline from 'readline';

export default (grunt) => {
  const publishConfig = grunt.config.get('packages').publish;
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
      `--secret-access-key=${deb.awsSecret}`,
      '--gpg-options=--digest-algo SHA512'
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
    ], {
      env: Object.assign({}, {
        'AWS_ACCESS_KEY': rpm.awsKey,
        'AWS_SECRET_KEY': rpm.awsSecret
      }, process.env)
    });
  }

  grunt.registerTask('publishPackages:staging', [
    '_publishPackages:confirm',
    '_publishPackages:upload:staging',
  ]);

  grunt.registerTask('publishPackages:production', [
    '_publishPackages:confirm',
    '_publishPackages:upload:production',
  ]);

  grunt.registerTask('_publishPackages:confirm', function () {
    function abort() {
      grunt.fail.fatal('Aborting publish');
    }

    const rl = readline.createInterface({
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

  grunt.registerTask('_publishPackages:upload', function (environment) {
    const aws = grunt.file.readJSON('.aws-config.json');
    const signature = grunt.file.readJSON('.signing-config.json');

    platforms.forEach((platform) => {
      if (platform.debPath) {
        debS3({
          filePath: platform.debPath,
          bucket: publishConfig[environment].bucket,
          prefix: publishConfig[environment].debPrefix,
          signatureKeyId: signature.id,
          arch: platform.debArch,
          awsKey: aws.key,
          awsSecret: aws.secret
        });
      }

      if (platform.rpmPath) {
        rpmS3({
          filePath: platform.rpmPath,
          bucket: publishConfig[environment].bucket,
          prefix: publishConfig[environment].rpmPrefix,
          signingKeyName: signature.name,
          awsKey: aws.key,
          awsSecret: aws.secret
        });
      }
    });

  });
};
