const path = require('path');
const babelPreset = require('../../src/optimize/babel/helpers').webpackPreset;
module.exports = {
  devtool: 'source-map',

  entry: {
    guide: './ui_framework/doc_site/src/index.js'
  },

  output: {
    path: path.resolve(__dirname, 'build'),
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
        presets: [babelPreset],
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
      test: /\.(woff|woff2|ttf|eot|svg|ico)(\?|$)/,
      loader: 'file',
    }, {
      test: require.resolve('jquery'),
      loader: 'expose?jQuery!expose?$'
    }]
  }
};
