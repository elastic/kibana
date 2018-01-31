module.exports = {
  build: {
    options: {
      presets: [
        require.resolve('@elastic/babel-preset-kibana/node')
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
