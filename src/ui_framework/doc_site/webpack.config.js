var path = require('path');

module.exports = {
  devtool: 'source-map',

  entry: {
    guide: './src/ui_framework/doc_site/src/index.js'
  },

  output: {
    path: path.resolve(__dirname, 'src/ui_framework/doc_site/build'),
    filename: 'bundle.js'
  },

  resolve: {
    root: [
      path.resolve(__dirname, 'src/ui_framework/doc_site')
    ]
  },

  module: {
    loaders: [{
      test: /\.jsx?$/,
      loader: 'babel',
      exclude: /node_modules/
    }, {
      test: /\.scss$/,
      loaders: ['style', 'css', 'sass'],
      exclude: /node_modules/
    }, {
      test: /\.html$/,
      loader: 'html',
      exclude: /node_modules/
    }, {
      test: require.resolve('jquery'),
      loader: 'expose?jQuery!expose?$'
    }]
  }
};
