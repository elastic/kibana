/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export function mirrorPluginStatus(upstreamPlugin, downstreamPlugin, ...statesToMirror) {
  upstreamPlugin.status.setMaxListeners(21); // We need more than the default, which is 10

  function mirror(previousState, previousMsg, newState, newMsg) {
    // eslint-disable-line no-unused-vars
    if (newState) {
      downstreamPlugin.status[newState](newMsg);
    }
  }

  if (statesToMirror.length === 0) {
    statesToMirror.push('change');
  }

  statesToMirror.map(state => upstreamPlugin.status.on(state, mirror));
  mirror(null, null, upstreamPlugin.status.state, upstreamPlugin.status.message); // initial mirroring
}
