module.exports = function (grunt) {
  return {
    unit: {
      options: {
        reporter: 'Spec',
        log: true,
        logErrors: true,
        urls: [
          'http://localhost:6767/test/'
        ],
        run: false
      }
    }
  };
};
