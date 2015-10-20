var path = require('path');
var config = require('./config');
var elasticsearch = require('elasticsearch');
var chunkSize = 100;

function ScenarioManager(server) {
  if (!server) throw new Error('No server defined');

  this.client = new elasticsearch.Client({
    host: server
  });
}

/**
 * Load a testing scenario
 * @param {string} id The scenario id to load
 * @return {Promise} A promise that is resolved when elasticsearch has a response
 */
ScenarioManager.prototype.load = function (id) {
  var scenario = config[id];
  if (!scenario) throw new Error('No scenario found for ' + id);

  var self = this;
  return Promise.all(scenario.bulk.map(function mapBulk(bulk) {
    var loadIndexDefinition;

    if (bulk.indexDefinition) {
      loadIndexDefinition = self.client.indices.create({
        index: bulk.indexName,
        body: require(path.join(scenario.baseDir, bulk.indexDefinition))
      });
    } else {
      loadIndexDefinition = Promise.resolve();
    }

    return loadIndexDefinition.then(function bulkRequest() {
      console.log('bulk.indexName = ' + bulk.indexName + '  bulk.source.size = ' + bulk.source.length);
      self.client.bulk({
        body: require(path.join(scenario.baseDir, bulk.source)),
      });
    });

  }));
};

/**
 * Delete a scenario
 * @param {string} index
 * @return {Promise} A promise that is resolved when elasticsearch has a response
 */
ScenarioManager.prototype.unload = function (id) {
  var scenario = config[id];
  if (!scenario) throw new Error('Expected index');

  var indices = scenario.bulk.map(function mapBulk(bulk) {
    return bulk.indexName;
  });

  return this.client.indices.delete({
    index: indices
  });
};

/**
 * Reload a scenario
 * @param {string} index
 * @return {Promise} A promise that is resolved when elasticsearch has a response
 */
ScenarioManager.prototype.reload = function (id) {
  var self = this;

  return this.unload(id).then(function load() {
    return self.load(id);
  });
};

/**
 * Sends a delete all indices request
 * @return {Promise} A promise that is resolved when elasticsearch has a response
 */
ScenarioManager.prototype.deleteAll = function () {
  return this.client.indices.delete({
    index: '*'
  });
};

/**
 * Load a testing scenario if not already loaded
 * @param {string} id The scenario id to load
 * @return {Promise} A promise that is resolved when elasticsearch has a response
 */
ScenarioManager.prototype.loadIfEmpty = function (id) {
  var self = this;
  var scenario = config[id];
  if (!scenario) throw new Error('No scenario found for ' + id);

  var self = this;
  return Promise.all(scenario.bulk.map(function mapBulk(bulk) {
    var loadIndexDefinition;

    return self.client.count({
      index: bulk.indexName
    }, function handleCountResponse(error, response) {
      // if (error) {
      //   console.log('Need to load index.  error=' + error);
      // } else {
      //   console.log('index=' + bulk.indexName + ' count=' + response.count);
      // }
      // if the index is undefined or count ===0 then call the load function above
      if (error || response.count === 0) {
        self.load(id);
      }
    });
  }));
};

module.exports = ScenarioManager;
