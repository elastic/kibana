var path = require('path');
var config = require('./config');
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
  var scenario = config[id];
  if (!scenario) throw new Error('No scenario found for ' + id);

  var self = this;
  return Promise.all(scenario.bulk.map(function bulk(file) {
    var mapping;

    if (scenario.mapping) {
      mapping = self.client.indices.create({
        index: file,
        body: require(path.join(scenario.base, scenario.mapping))
      });
    } else {
      mapping = Promise.resolve();
    }

    return mapping.then(function () {
      self.client.bulk({
        body: require(path.join(scenario.base, file)),
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

  return this.client.indices.delete({
    index: scenario.bulk
  });
};

/**
* Reload a scenario
* @param {string} index
* @return {Promise} A promise that is resolved when elasticsearch has a response
*/
ScenarioManager.prototype.reload = function (id) {
  var self = this;

  return this.unload(id).then(function () {
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

module.exports = ScenarioManager;
