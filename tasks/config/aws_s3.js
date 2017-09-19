export default function (grunt) {
  const { sha, version } = grunt.config.get('build');
  const versionSha = `${version}-${sha.substr(0, 7)}`;

  return {
    options: {
      bucket: 'download.elasticsearch.org',
      access: 'private',
      uploadConcurrency: 10
    },

    staging: {
      files: [{
        expand: true,
        cwd: 'target',
        src: ['**'],
        dest: `kibana/staging/${versionSha}/kibana/`
      }]
    },
    ci: {
      bucket: 'kibana-ci-artifacts',
      region: 'us-west-2',
      files: [{
        expand: true,
        cwd: 'test/functional/screenshots',
        src: ['**'],
        dest: `kibana/${versionSha}/screenshots/`
      }, {
        expand: true,
        cwd: 'target',
        src: ['**'],
        dest: `kibana/${versionSha}/packages/`
      }]
    }
  };
}
