module.exports = function (grunt) {
  const { config } = grunt;

  return {
    release: {
      bucket: 'download.elasticsearch.org',
      access: 'private',
      debug: false
    }
  };
};
