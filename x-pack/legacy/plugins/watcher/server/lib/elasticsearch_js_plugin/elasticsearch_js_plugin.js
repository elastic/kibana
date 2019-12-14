/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const elasticsearchJsPlugin = (Client, config, components) => {
  // eslint-disable-line no-unused-vars
  const ca = components.clientAction.factory;

  Client.prototype.watcher = components.clientAction.namespaceFactory();
  const watcher = Client.prototype.watcher.prototype;

  /**
   * Perform a [watcher.deactivateWatch](https://www.elastic.co/guide/en/x-pack/current/watcher-api-deactivate-watch.html) request
   *
   * @param {Object} params - An object with parameters used to carry out this action
   * @param {Duration} params.masterTimeout - Specify timeout for watch write operation
   * @param {String} params.id - Watch ID
   */
  watcher.deactivateWatch = ca({
    params: {
      masterTimeout: {
        name: 'master_timeout',
        type: 'duration',
      },
    },
    url: {
      fmt: '/_watcher/watch/<%=id%>/_deactivate',
      req: {
        id: {
          type: 'string',
          required: true,
        },
      },
    },
    method: 'PUT',
  });

  /**
   * Perform a [watcher.activateWatch](https://www.elastic.co/guide/en/x-pack/current/watcher-api-activate-watch.html) request
   *
   * @param {Object} params - An object with parameters used to carry out this action
   * @param {Duration} params.masterTimeout - Specify timeout for watch write operation
   * @param {String} params.id - Watch ID
   */
  watcher.activateWatch = ca({
    params: {
      masterTimeout: {
        name: 'master_timeout',
        type: 'duration',
      },
    },
    url: {
      fmt: '/_watcher/watch/<%=id%>/_activate',
      req: {
        id: {
          type: 'string',
          required: true,
        },
      },
    },
    method: 'PUT',
  });

  /**
   * Perform a [watcher.ackWatch](https://www.elastic.co/guide/en/x-pack/current/watcher-api-ack-watch.html) request
   *
   * @param {Object} params - An object with parameters used to carry out this action
   * @param {Duration} params.masterTimeout - Specify timeout for watch write operation
   * @param {String} params.id - Watch ID
   * @param {String} params.action - Action ID
   */
  watcher.ackWatch = ca({
    params: {
      masterTimeout: {
        name: 'master_timeout',
        type: 'duration',
      },
    },
    url: {
      fmt: '/_watcher/watch/<%=id%>/_ack/<%=action%>',
      req: {
        id: {
          type: 'string',
          required: true,
        },
        action: {
          type: 'string',
          required: true,
        },
      },
    },
    method: 'POST',
  });

  /**
   * Perform a [watcher.deleteWatch](https://www.elastic.co/guide/en/x-pack/current/watcher-api-delete-watch.html) request
   *
   * @param {Object} params - An object with parameters used to carry out this action
   * @param {Duration} params.masterTimeout - Specify timeout for watch write operation
   * @param {Boolean} params.force - Specify if this request should be forced and ignore locks
   * @param {String} params.id - Watch ID
   */
  watcher.deleteWatch = ca({
    params: {
      masterTimeout: {
        name: 'master_timeout',
        type: 'duration',
      },
      force: {
        type: 'boolean',
      },
    },
    url: {
      fmt: '/_watcher/watch/<%=id%>',
      req: {
        id: {
          type: 'string',
          required: true,
        },
      },
    },
    method: 'DELETE',
  });

  /**
   * Perform a [watcher.executeWatch](https://www.elastic.co/guide/en/x-pack/current/watcher-api-execute-watch.html) request
   *
   * @param {Object} params - An object with parameters used to carry out this action
   */
  watcher.executeWatch = ca({
    params: {
      masterTimeout: {
        name: 'master_timeout',
        type: 'duration',
      },
    },
    url: {
      fmt: '/_watcher/watch/_execute',
    },
    needBody: true,
    method: 'POST',
  });

  /**
   * Perform a [watcher.getWatch](https://www.elastic.co/guide/en/x-pack/current/watcher-api-get-watch.html) request
   *
   * @param {Object} params - An object with parameters used to carry out this action
   * @param {String} params.id - Watch ID
   */
  watcher.getWatch = ca({
    params: {},
    url: {
      fmt: '/_watcher/watch/<%=id%>',
      req: {
        id: {
          type: 'string',
          required: true,
        },
      },
    },
  });

  /**
   * Perform a [watcher.putWatch](https://www.elastic.co/guide/en/x-pack/current/watcher-api-put-watch.html) request
   *
   * @param {Object} params - An object with parameters used to carry out this action
   * @param {Duration} params.masterTimeout - Specify timeout for watch write operation
   * @param {String} params.id - Watch ID
   */
  watcher.putWatch = ca({
    params: {
      masterTimeout: {
        name: 'master_timeout',
        type: 'duration',
      },
    },
    url: {
      fmt: '/_watcher/watch/<%=id%>',
      req: {
        id: {
          type: 'string',
          required: true,
        },
      },
    },
    needBody: true,
    method: 'PUT',
  });

  /**
   * Perform a [watcher.restart](https://www.elastic.co/guide/en/x-pack/current/watcher-api-restart.html) request
   *
   * @param {Object} params - An object with parameters used to carry out this action
   */
  watcher.restart = ca({
    params: {},
    url: {
      fmt: '/_watcher/_restart',
    },
    method: 'PUT',
  });

  /**
   * Perform a [watcher.start](https://www.elastic.co/guide/en/x-pack/current/watcher-api-start.html) request
   *
   * @param {Object} params - An object with parameters used to carry out this action
   */
  watcher.start = ca({
    params: {},
    url: {
      fmt: '/_watcher/_start',
    },
    method: 'PUT',
  });

  /**
   * Perform a [watcher.stats](https://www.elastic.co/guide/en/x-pack/current/watcher-api-stats.html) request
   *
   * @param {Object} params - An object with parameters used to carry out this action
   */
  watcher.stats = ca({
    params: {},
    url: {
      fmt: '/_watcher/stats',
    },
  });

  /**
   * Perform a [watcher.stop](https://www.elastic.co/guide/en/x-pack/current/watcher-api-stop.html) request
   *
   * @param {Object} params - An object with parameters used to carry out this action
   */
  watcher.stop = ca({
    params: {},
    url: {
      fmt: '/_watcher/_stop',
    },
    method: 'PUT',
  });
};
