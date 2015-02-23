module.exports = {
  options: {
    timeout: 2000,
    ignoreLeaks: false,
    reporter: 'dot'
  },
  all: { src: ['<%= root %>/test/unit/{server,tasks}/**/*.js'] }
};
