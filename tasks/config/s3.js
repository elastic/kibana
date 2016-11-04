module.exports = function (grunt) {
  return {
    release: {
      bucket: 'download.elasticsearch.org',
      access: 'private',
      debug: false
    }
  };
};
