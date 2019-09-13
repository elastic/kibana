
import {
  Log,
  Try,
} from './';

export default (function () {

  const elasticsearch = require('@elastic/elasticsearch');
  const Promise = require('bluebird');

  function EsClient(server) {
    if (!server) throw new Error('No server defined');

    // NOTE: some large sets of test data can take several minutes to load
    Log.debug('Creating new elasticsearch client on ' + server);
    this.client = new elasticsearch.Client({
      node: server,
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

    /**
    * Delete a doc
    * https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/api-reference.html#api-delete
    * @param {string} index
    * @return {Promise} A promise that is resolved when elasticsearch has a response
    */
    deleteDoc: function (index, type, docId) {

      return this.client.delete({
        index: index,
        type: type,
        id: docId   })
      .catch(function (reason) {
        Log.debug('Failed to delete doc, reason.message: ' + reason.message);
        throw reason;
      });
    },


    /*
    ** Gets defaultIndex from the config doc.
    */
    getDefaultIndex: function () {
      let defaultIndex;

      return this.client.search({
        index: '.kibana',
        q: 'type:config'
      })
      .then(function (response) {
        console.log(response);
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

    /*
    ** Gets configId which is needed when we're going to update the config doc.
    ** Also used after deleting .kibana index to know Kibana has recreated it.
    */
    getConfigId: function () {
      let configId;

      return this.client.search({
        index: '.kibana',
        q: 'type:config'
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
          Log.debug('config._id =' + configId);
          return configId;
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
    * Add fields to the config doc (like setting timezone and defaultIndex)
    * @return {Promise} A promise that is resolved when elasticsearch has a response
    */
    removeDefaultIndexPattern: function () {
      // first we need to get the config doc's id so we can use it in our _update call
      const self = this;
      //const docMapString = JSON.stringify(docMap);

      return this.getConfigId()
      // now that we have the id, we can update
      .then(function (configId) {
        Log.debug('Removing default index pattern');
        return self.client.update({
          index: '.kibana',
          type: 'config',
          id: configId,
          body: {
            "script" : "ctx._source.remove(\"defaultIndex\")"
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

      return this.delete('.kibana')
      .then(function () {
        if (!docMap) {
          return Try.try(function () {
            return self.getConfigId();
          });
        } else {
          return Try.try(function () {
            return self.updateConfigDoc(docMap);
          });
        }
      })
      .catch(function (err) {
        throw err;
      });
    },


    /**
    *
    * @return {Promise} A promise that is resolved when elasticsearch has a response
    */
    index: function (index, type, id, jsonInput) {

      Log.debug('\n\nthis.client.index(' + index + '/' + type + '/' + id + ')');
      Log.debug('\n\nJSON = ' + JSON.stringify(jsonInput) + '\n\n');
      return this.client.index({
        index: index,
        type: type,
        id: id,
        body: JSON.stringify(jsonInput)
      })
      .then(function (response) {
        if (response.errors) {
          throw new Error(
            'index failed\n' +
              response.items
              .map(i => i[Object.keys(i)[0]].error)
              .filter(Boolean)
              .map(err => '  ' + JSON.stringify(err))
              .join('\n')
          );
        } else {
          return response;
        }
      });
    },

    get: function (index, type, id) {

      return this.client.get({
        index: index,
        type: type,
        id: id
      })
      .then(function (response) {
        if (response.errors) {
          throw new Error(
            'get failed\n' +
              response.items
              .map(i => i[Object.keys(i)[0]].error)
              .filter(Boolean)
              .map(err => '  ' + JSON.stringify(err))
              .join('\n')
          );
        } else {
          return response;
        }
      });
    },

    search: function (index, query) {
      console.log('search {' + query + '}');
      return this.client.search({
        index: index,
        q: query
      })
      .then(function (response) {
        if (response.errors) {
          // console.log("******************* ERRORS HERE?");
          throw new Error(
            'search failed\n' +
              response.items
              .map(i => i[Object.keys(i)[0]].error)
              .filter(Boolean)
              .map(err => '  ' + JSON.stringify(err))
              .join('\n')
          );
        } else {
          // console.log('Returning search response = \n' + JSON.stringify(response));
          return response;
        }
      });
    },


    // client.watcher.putWatch([params] [, options] [, callback])
    putWatch: function (watchId, myWatch) {
      return this.client.watcher.putWatch({
        id: watchId,
        body: myWatch
      })
      .then(function (response) {
        if (response.errors) {
          // console.log("******************* ERRORS HERE?");
          throw new Error(
            'search failed\n' +
              response.items
              .map(i => i[Object.keys(i)[0]].error)
              .filter(Boolean)
              .map(err => '  ' + JSON.stringify(err))
              .join('\n')
          );
        } else {
          // console.log('Returning search response = \n' + JSON.stringify(response));
          return response;
        }
      });
    },

    // client.watcher.putWatch([params] [, options] [, callback])
    deleteWatch: function (watchId) {
      return this.client.watcher.deleteWatch({
        id: watchId
      })
      .then(function (response) {
        if (response.errors) {
          // console.log("******************* ERRORS HERE?");
          throw new Error(
            'search failed\n' +
              response.items
              .map(i => i[Object.keys(i)[0]].error)
              .filter(Boolean)
              .map(err => '  ' + JSON.stringify(err))
              .join('\n')
          );
        } else {
          // console.log('Returning search response = \n' + JSON.stringify(response));
          return response;
        }
      });
    }



  };

  return EsClient;
}());
