module.exports = function (grunt) {
  let { config } = grunt;

  return {
    release: {
      bucket: 'download.elasticsearch.org',
      access: 'private',
      debug: false
    }
  };
};
