module.exports = function (grunt) {
  return {
    all: {
      options: {
        verbose: true,
        threshold: 80,
        log: true,
        logErros: true,
        urls: ['http://localhost:6767/test/index.html'],
        reporter: 'Spec'
      }
    }
  };
};
