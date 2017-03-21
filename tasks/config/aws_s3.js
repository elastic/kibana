export default function (grunt) {
  const { sha, version } = grunt.config.get('build');

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
        dest: `kibana/staging/${version}-${sha.substr(0, 7)}/kibana/`
      }]
    }
  };
}
