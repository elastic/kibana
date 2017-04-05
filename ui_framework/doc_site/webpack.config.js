const path = require('path');

module.exports = {
  devtool: 'source-map',

  entry: {
    guide: './ui_framework/doc_site/src/index.js'
  },

  output: {
    path: path.resolve(__dirname, 'ui_framework/doc_site/build'),
    filename: 'bundle.js'
  },

  resolve: {
    root: [
      path.resolve(__dirname, 'src/ui_framework/doc_site')
    ]
  },

  // These are necessasry for using Enzyme with Webpack (https://github.com/airbnb/enzyme/blob/master/docs/guides/webpack.md).
  externals: {
    'react/lib/ExecutionEnvironment': true,
    'react/lib/ReactContext': true,
    'react/addons': true,
  },

  module: {
    loaders: [{
      test: /\.json$/,
      loader: 'json-loader',
    }, {
      test: /\.js$/,
      loader: 'babel',
      exclude: /node_modules/,
      query: {
        presets: ['es2015', 'react'],
      },
    }, {
      test: /\.scss$/,
      loaders: ['style', 'css', 'postcss', 'sass'],
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
