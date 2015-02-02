module.exports = {
  options: {
    timeout: 2000,
    ignoreLeaks: false,
    reporter: 'dot'
  },
  all: { src: ['<%= root %>/test/server/unit/**/*.js']}
};
