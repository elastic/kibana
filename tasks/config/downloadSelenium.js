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
        md5: '774efe2d84987fb679f2dea038c2fa32',
        path: path.join(grunt.config.get('root'), 'selenium', FILE)
      }
    }
  };
};
