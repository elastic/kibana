module.exports = {
  build: {
    options: {
      presets: [
        require.resolve('../../src/babel-preset/node')
      ]
    },
    src: [
      'build/kibana/**/*.js',
      '!**/public/**',
      '!**/node_modules/**',
      '!**/bower_components/**',
      '!**/__tests__/**',
      '!**/vega_vis/**',
    ],
    dest: '.',
    expand: true
  }
};
