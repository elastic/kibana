define(function (require) {

  const config = require('intern').config;
  const execFileSync = require('intern/dojo/node!child_process').execFileSync;
  const resolve = require('intern/dojo/node!path').resolve;
  const _ = require('intern/dojo/node!lodash');
  const url = require('intern/dojo/node!url');
  const path = require('intern/dojo/node!path');

  // npm install --save-dev elasticdump
  var __dirname = path.resolve(path.dirname());
  const bin = resolve(__dirname, '../../node_modules/.bin/elasticdump');
  const esUrl = 'http://localhost:9200'; //url.format(config.servers.elasticsearch);
  const kIndex = '.kibana';


  function run() {
    return execFileSync(bin, [
      // '--input=http://localhost:9200/.kibana',
      //   '--output='

      '--input=' + esUrl + '/' + kIndex + '',
      '--output=$' // write output to stdout
    ]).toString('utf8');
  }

});
