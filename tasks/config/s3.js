module.exports = function (grunt) {
  var { config } = grunt;

  return {
    release: {
      bucket: 'download.elasticsearch.org',
      access: 'private',
      debug: false
    }
  };
};
