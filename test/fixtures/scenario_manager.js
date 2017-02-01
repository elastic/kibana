let path = require('path');
let elasticsearch = require('elasticsearch');
let Promise = require('bluebird');
let config = require('./config').scenarios;

function ScenarioManager(server) {
  if (!server) throw new Error('No server defined');

  // NOTE: some large sets of test data can take several minutes to load
  this.client = new elasticsearch.Client({
    host: server,
    requestTimeout: 300000,
    apiVersion: 'master',
    defer: function () {
      return Promise.defer();
    }
  });
}

/**
* Load a testing scenario
* @param {string} id The scenario id to load
* @return {Promise} A promise that is resolved when elasticsearch has a response
*/
ScenarioManager.prototype.load = function (id) {
  let self = this;
  let scenario = config[id];
  if (!scenario) return Promise.reject('No scenario found for ' + id);

  return Promise.all(scenario.bulk.map(function mapBulk(bulk) {
    let loadIndexDefinition;
    if (bulk.indexDefinition) {
      let body = require(path.join(scenario.baseDir, bulk.indexDefinition));
      loadIndexDefinition = self.client.indices.create({
        index: bulk.indexName,
        body: body
      });
    } else {
      loadIndexDefinition = Promise.resolve();
    }

    return loadIndexDefinition
    .then(function bulkRequest() {
      let body = require(path.join(scenario.baseDir, bulk.source));
      return self.client.bulk({
        body: body
      });
    })
    .then(function (response) {
      if (response.errors) {
        throw new Error(
          'bulk failed\n' +
            response.items
            .map(i => i[Object.keys(i)[0]].error)
            .filter(Boolean)
            .map(err => '  ' + JSON.stringify(err))
            .join('\n')
        );
      }
    })
    .catch(function (err) {
      if (bulk.haltOnFailure === false) return;
      throw err;
    });
  }));
};

/**
* Delete a scenario
* @param {string} index
* @return {Promise} A promise that is resolved when elasticsearch has a response
*/
ScenarioManager.prototype.unload = function (id) {
  let scenario = config[id];
  if (!scenario) return Promise.reject('No scenario found for ' + id);

  let indices = scenario.bulk.map(function mapBulk(bulk) {
    return bulk.indexName;
  });

  return this.client.indices.delete({
    index: indices
  })
  .catch(function (reason) {
    // if the index never existed yet, or was already deleted it's OK
    if (reason.message.indexOf('index_not_found_exception') < 0) {
      console.log('reason.message: ' + reason.message);
      throw reason;
    }
  });
};

/**
* Reload a scenario
* @param {string} index
* @return {Promise} A promise that is resolved when elasticsearch has a response
*/
ScenarioManager.prototype.reload = function (id) {
  let self = this;

  return self.unload(id)
  .then(function load() {
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
  let self = this;
  let scenario = config[id];
  if (!scenario) throw new Error('No scenario found for ' + id);

  return Promise.all(scenario.bulk.map(function mapBulk(bulk) {
    let loadIndexDefinition;

    return self.client.count({
      index: bulk.indexName
    })
    .then(function handleCountResponse(response) {
      if (response.count === 0) {
        return self.load(id);
      }
    });
  }))
  .catch(function (reason) {
    return self.load(id);
  });
};

module.exports = ScenarioManager;
