const path = require('path');
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
    modules: [
      path.resolve(__dirname, 'src/ui_framework/doc_site'),
      'node_modules',
    ]
  },

  // These are necessasry for using Enzyme with Webpack (https://github.com/airbnb/enzyme/blob/master/docs/guides/webpack.md).
  externals: {
    'react/lib/ExecutionEnvironment': true,
    'react/lib/ReactContext': true,
    'react/addons': true,
  },

  module: {
    rules: [{
      test: /\.js$/,
      loader: 'babel-loader',
      exclude: /node_modules/,
      query: {
        presets: [
          require.resolve('@kbn/babel-preset/webpack')
        ],
      },
    }, {
      test: /\.scss$/,
      loaders: ['style-loader', 'css-loader', 'postcss-loader', 'sass-loader'],
      exclude: /node_modules/
    }, {
      test: /\.html$/,
      loader: 'html-loader',
      exclude: /node_modules/
    }, {
      test: /\.(woff|woff2|ttf|eot|svg|ico)(\?|$)/,
      loader: 'file-loader',
    }, {
      test: require.resolve('jquery'),
      loader: 'expose-loader?jQuery!expose-loader?$'
    }]
  }
};
