var path = require('path');
var registry = require('./registry');
var elasticsearch = require('elasticsearch');

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
  var scenario = registry[id];
  if (!scenario) throw new Error('No scenario found for ' + id);

  var self = this;
  return Promise.all(scenario.bulk
      .map(function createIndex(bulk) {
        if (!bulk.mapping) return;
        return self.client.indices.create({
          index: bulk.file,
          body: require(path.join(scenario.base, bulk.mapping))
        });
      }))
    .then(function loadBulkData() {
      return Promise.all(scenario.bulk.map(function bulk(bulk) {
        return self.client.bulk({
          body: require(path.join(scenario.base, bulk.file)),
        });
      }));
    });
};

/**
 * Load a testing scenario if not already loaded
 * @param {string} id The scenario id to load
 * @return {Promise} A promise that is resolved when elasticsearch has a response
 */
ScenarioManager.prototype.loadIfEmpty = function (id) {
  var scenario = registry[id];
  if (!scenario) throw new Error('No scenario found for ' + id);

  var self = this;
  return Promise.all(scenario.bulk
    .map(function createIndex(bulk) {
      console.log(' bulk=' + bulk + ' bulk.file=' + bulk.file); // { file: '.kibana' }

      return self.client.count({
        index: bulk.file
      }, function handleCountResponse(error, response) {
        if (error) {
          console.log('Need to load index.  error=' + error);
        } else {
          console.log('index=' + bulk.file + ' count=' + response.count);
        }
        if (error || response.count === 0) {
          if (!bulk.mapping) return;
          return self.client.indices.create({
            index: bulk.file,
            body: require(path.join(scenario.base, bulk.mapping))
          })
          .then(function loadBulkData() {
            return Promise.all(scenario.bulk.map(function bulk(bulk) {
              return self.client.bulk({
                body: require(path.join(scenario.base, bulk.file)),
              });
            }));
          });
        }
      });
    })
  );
};

/**
 * Delete a scenario
 * @param {string} index
 * @return {Promise} A promise that is resolved when elasticsearch has a response
 */
ScenarioManager.prototype.unload = function (id) {
  var scenario = registry[id];
  if (!scenario) throw new Error('Expected index');

  var indices = scenario.bulk.map(function (bulk) {
    return bulk.file;
  });

  return this.client.indices.delete({
    index: indices
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

module.exports = ScenarioManager;
