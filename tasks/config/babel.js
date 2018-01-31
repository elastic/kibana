module.exports = {
  build: {
    options: {
      presets: [
        require.resolve('@kbn/babel-preset/node')
      ]
    },
    src: [
      'build/kibana/**/*.js',
      '!**/public/**',
      '!**/node_modules/**',
      '!**/bower_components/**',
      '!**/__tests__/**'
    ],
    dest: '.',
    expand: true
  }
};
