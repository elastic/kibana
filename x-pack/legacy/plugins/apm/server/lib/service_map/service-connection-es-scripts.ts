/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const initServiceConnsScript = {
  lang: 'painless',
  source: `
    state.mappedDocs = new HashMap();
    String[] docKeys = new String[] {
      '@timestamp',
      'transaction.id',
      'parent.id',
      'span.id',
      'span.type',
      'span.subtype',
      'service.name',
      'service.environment',
      'destination.address'
    };
    state.docKeys = docKeys;
  `
};

export const mapServiceConnsScript = {
  lang: 'painless',
  source: `
    def mappedDoc = new HashMap();
    for (docKey in state.docKeys) {
      if (!doc[docKey].empty) {
        mappedDoc[docKey] = doc[docKey].value;
      }
    }

    if(!state.mappedDocs.containsKey(mappedDoc['parent.id'])) {
      state.mappedDocs.put(mappedDoc['parent.id'], new ArrayList());
    }

    def id;
    if (!doc['span.id'].empty) {
      id = doc['span.id'].value;
    } else {
      id = doc['transaction.id'].value;
    }

    if (mappedDoc['parent.id'] != id) {
      state.mappedDocs[mappedDoc['parent.id']].add(mappedDoc);
    }
  `
};

export const combineServiceConnsScript = {
  lang: 'painless',
  source: `return state.mappedDocs`
};

export const reduceServiceConnsScript = {
  lang: 'painless',
  source: `
    void extractChildren(def caller, def mappedDocs, def upstream, def serviceConnections) {
      def callerId;
      if (caller.containsKey('span.id')) {
        callerId = caller['span.id'];
      } else {
        callerId = caller['transaction.id'];
      }
      if (mappedDocs.containsKey(callerId)) {
        for (mappedDoc in mappedDocs[callerId]) {
          if (caller['span.type'] == 'external') {
            upstream.add(caller['service.name'] + "/" + caller['service.environment']);
            def serviceConnection = new HashMap();
            serviceConnection.caller = caller;
            serviceConnection.callee = mappedDoc;
            serviceConnection.upstream = new ArrayList(upstream);
            serviceConnections.add(serviceConnection);
            extractChildren(mappedDoc, mappedDocs, upstream, serviceConnections);
            upstream.remove(upstream.size() - 1);
          } else {
            extractChildren(mappedDoc, mappedDocs, upstream, serviceConnections);
          }
        }
      } else {
        // no connection found
        def serviceConnection = new HashMap();
        serviceConnection.caller = caller;
        serviceConnection.upstream = new ArrayList(upstream);
        serviceConnection.upstream.add(caller['service.name'] + "/" + caller['service.environment']);
        serviceConnections.add(serviceConnection);
      }
    }


    def serviceConnections = new ArrayList();
    def mappedDocs = new HashMap();

    // merge results from shards
    for (state in states) {
      for (s in state.entrySet()) {
        def v = s.getValue();
        def k = s.getKey();
        if (!mappedDocs.containsKey(k)) {
          mappedDocs[k] = v;
        } else {
          for (p in v) {
            mappedDocs[k].add(p);
          }
        }
      }
    }

    if (mappedDocs.containsKey(null) && mappedDocs[null].size() > 0) {
      def node = mappedDocs[null][0];
      def upstream = new ArrayList();
      extractChildren(node, mappedDocs, upstream, serviceConnections);
      return serviceConnections;
    }
    return [];
  `
};
