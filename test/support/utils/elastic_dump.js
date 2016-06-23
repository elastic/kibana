import { config } from '../';
import {
  Log,
} from './';

export default (function () {
  var util = require('util');
  var path = require('path');
  var url = require('url');
  var resolve = require('path').resolve;
  var Elasticdump = require('elasticdump').elasticdump;

  function ElasticDump() {
  }

  ElasticDump.prototype = {

    /*
    ** This function is basically copied from
    ** https://github.com/taskrabbit/elasticsearch-dump/blob/master/bin/elasticdump
    ** and allows calling elasticdump for importing or exporting data from Elasticsearch
    */
    elasticdumpModule: function elasticdumpModule(myinput, myoutput, index, mytype) {

      var options = {
        limit:           100,
        offset:          0,
        debug:           false,
        type:            mytype,
        delete:          false,
        all:             false,
        maxSockets:      null,
        input:           myinput,
        'input-index':   null,
        output:          myoutput,
        'output-index':  index,
        inputTransport:  null,
        outputTransport: null,
        searchBody:      null,
        sourceOnly:      false,
        jsonLines:       false,
        format:          '',
        'ignore-errors': false,
        scrollTime:      '10m',
        timeout:         null,
        skip:            null,
        toLog:           null,
      };
      var dumper = new Elasticdump(options.input, options.output, options);

      dumper.on('log',   function (message) { Log.debug(message); });
      dumper.on('error', function (error)   { Log.debug('error', 'Error Emitted => ' + (error.message || JSON.stringify(error))); });

      var promise = new Promise(function (resolve, reject) {
        dumper.dump(function (error, totalWrites) {
          if (error) {
            Log.debug('THERE WAS AN ERROR :-(');
            reject(Error(error));
          } else {
            resolve ('elasticdumpModule success');
          }
        });
      });
      return promise;
    },

    /*
    ** Dumps data from Elasticsearch into json files.
    ** Takes a simple filename as input like 'dashboard' (for dashboard tests).
    ** Appends ''.mapping.json' and '.data.json' for the actual filenames.
    ** Writes files to the Kibana root dir.
    ** Fails if the files already exist, so consider appending a timestamp to filename.
    */
    elasticDump: function elasticDump(index, file) {
      var self = this;
      Log.debug('Dumping mapping from ' + url.format(config.servers.elasticsearch) + '/' + index
        + ' to (' + file + '.mapping.json)');
      return this.elasticdumpModule(url.format(config.servers.elasticsearch),
        file + '.mapping.json', index, 'mapping')
      .then(function () {
        Log.debug('Dumping data from ' + url.format(config.servers.elasticsearch) + '/' + index
          + ' to (' + file + '.data.json)');
        return self.elasticdumpModule(url.format(config.servers.elasticsearch),
          file + '.data.json', index, 'data');
      });
    },

    /*
    ** Loads data from json files into Elasticsearch.
    ** Takes a simple filename as input like 'dashboard' (for dashboard tests).
    ** Appends ''.mapping.json' and '.data.json' for the actual filenames.
    ** Path /test/fixtures/dump_data is hard-coded
    */
    elasticLoad: function elasticLoad(file, index) {
      // TODO: should we have a flag to delete the index first?
      // or use scenarioManager.unload(index) ? <<- currently this
      var self = this;
      Log.debug('Loading mapping (test/fixtures/dump_data/' + file + '.mapping.json) into '
        + url.format(config.servers.elasticsearch) + '/' + index);
      return this.elasticdumpModule('test/fixtures/dump_data/' + file + '.mapping.json',
        url.format(config.servers.elasticsearch), index, 'mapping')
      .then(function () {
        Log.debug('Loading data (test/fixtures/dump_data/' + file + '.data.json) into '
          + url.format(config.servers.elasticsearch) + '/' + index);
        return self.elasticdumpModule('test/fixtures/dump_data/' + file + '.data.json',
          url.format(config.servers.elasticsearch), index, 'data');
      });
    },
  };

  return ElasticDump;
}());
