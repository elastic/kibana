
import {
  Log,
  Try,
} from './';

export default (function () {

  const elasticsearch = require('elasticsearch');
  const Promise = require('bluebird');

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

  EsClient.prototype = {
    constructor: EsClient,


    /**
    * Delete an index
    * @param {string} index
    * @return {Promise} A promise that is resolved when elasticsearch has a response
    */
    delete: function (index) {

      return this.client.indices.delete({
        index: index
      })
      .catch(function (reason) {
        // if the index never existed yet, or was already deleted it's OK
        if (reason.message.indexOf('index_not_found_exception') < 0) {
          Log.debug('reason.message: ' + reason.message);
          throw reason;
        }
      });
    },

    /*
    ** Gets configId which is needed when we're going to update the config doc.
    ** Also used after deleting .kibana index to know Kibana has recreated it.
    */
    getConfigId: function () {
      let configId;

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
          Log.debug('config._id = ' + configId);
          return configId;
        }
      });
    },

    /*
    ** Gets defaultIndex from the config doc.
    */
    getDefaultIndex: function () {
      let defaultIndex;

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
          defaultIndex = response.hits.hits[0]._source.defaultIndex;
          Log.debug('config.defaultIndex = ' + defaultIndex);
          return defaultIndex;
        }
      });
    },

    /**
    * Add fields to the config doc (like setting timezone and defaultIndex)
    * @return {Promise} A promise that is resolved when elasticsearch has a response
    */
    updateConfigDoc: function (docMap) {
      // first we need to get the config doc's id so we can use it in our _update call
      const self = this;
      let configId;
      const docMapString = JSON.stringify(docMap);

      return this.getConfigId()
      // now that we have the id, we can update
      .then(function (configId) {
        Log.debug('updating config with ' + docMapString);
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
    },

    /**
    * Wrap the common 'delete index', 'updateConfigDoc' into one.
    * [docMap] is optional.
    * @return {Promise} A promise that is resolved when elasticsearch has a response
    */
    deleteAndUpdateConfigDoc: function (docMap) {
      const self = this;
      let configId;

      return this.delete('.kibana')
      .then(function () {
        if (!docMap) {
          return Try.try(function () {
            return self.getConfigId();
          });
        } else {
          const docMapString = JSON.stringify(docMap);
          return Try.try(function () {
            return self.updateConfigDoc(docMap);
          });
        }
      })
      .catch(function (err) {
        throw err;
      });
    }

  };

  return EsClient;
}());
