var path = require('path');
import { resolve as resolveUrl } from 'url';

const URL = 'https://selenium-release.storage.googleapis.com/2.53/selenium-server-standalone-2.53.0.jar';
// must match selenium-version in test/intern.js
const DIR = resolveUrl(URL, './');
const FILE = URL.replace(DIR, '');

module.exports = function (grunt) {
  return {
    options: {
      selenium: {
        filename: FILE,
        server: DIR,
        md5: 'b2784fc67c149d3c13c83d2108104689',
        path: path.join(grunt.config.get('root'), 'selenium', FILE)
      }
    }
  };
};
