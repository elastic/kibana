var elasticsearch = require('elasticsearch');
var Promise = require('bluebird');

function EsClient(server) {
  if (!server) throw new Error('No server defined');

  // NOTE: some large sets of test data can take several minutes to load
  this.client = new elasticsearch.Client({
    host: server,
    requestTimeout: 300000,
    defer: function () {
      return Promise.defer();
    }
  });
}

/**
* Add fields to the config doc (like setting timezone and defaultIndex)
* @return {Promise} A promise that is resolved when elasticsearch has a response
*/
EsClient.prototype.updateConfigDoc = function (docMap) {
  // first we need to get the config doc's id so we can use it in our _update call
  var self = this;
  var configId;
  var docMapString = JSON.stringify(docMap);

  return this.client.search({
    index: '.kibana',
    type: 'config'
  })
  .then(function (response) {
    if (response.errors) {
      throw new Error(
        'get config failed\n' +
          response.items
          .map(i => i[Object.keys(i)[0]].error)
          .filter(Boolean)
          .map(err => '  ' + JSON.stringify(err))
          .join('\n')
      );
    } else {
      configId = response.hits.hits[0]._id;
      console.log('config._id =' + configId);
    }
  })
  // now that we have the id, we can update
  // return scenarioManager.updateConfigDoc({'dateFormat:tz':'UTC', 'defaultIndex':'logstash-*'});
  .then(function (response) {
    console.log('updating config with ' + docMapString);
    return self.client.update({
      index: '.kibana',
      type: 'config',
      id: configId,
      body: {
        'doc':
          docMap
      }
    });
  })
  .catch(function (err) {
    throw err;
  });
};

module.exports = EsClient;
