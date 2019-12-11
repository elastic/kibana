/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const mapServiceConnsScript = {
  lang: 'painless',
  source: `
    def s = new HashMap();

    if (!doc['span.id'].empty) {
      s.id = doc['span.id'].value
    } else {
      s.id = doc['transaction.id'].value;
      s.transaction = true;
    }
    if (!doc['parent.id'].empty) {
      s.parent = doc['parent.id'].value;
    }
    if (!doc['service.environment'].empty) {
      s.environment = doc['service.environment'].value;
    }

    if (!doc['destination.address'].empty) {
      s.destination = doc['destination.address'].value;
    }

    if (!doc['span.type'].empty) {
      s.span_type = doc['span.type'].value;
    }

    if (!doc['span.subtype'].empty) {
      s.span_subtype = doc['span.subtype'].value;
    }

    s.timestamp = doc['@timestamp'].value;
    s.service_name = doc['service.name'].value;
    if(!state.spans.containsKey(s.parent)) {
      state.spans.put(s.parent, new ArrayList())
    }

    if (s.parent != s.id) {
      state.spans[s.parent].add(s)
    }
  `
};

export const reduceServiceConnsScript = {
  lang: 'painless',
  source: `
    void extractChildren(def caller, def spans, def upstream, def conns, def count) {
      // TODO: simplify this
      if (spans.containsKey(caller.id)) {
        for (s in spans[caller.id]) {
          if (caller.span_type == 'external') {
            upstream.add(caller.service_name + "/" + caller.environment);
            def conn = new HashMap();
            conn.caller = caller;
            conn.callee = s;
            conn.upstream = new ArrayList(upstream);
            conns.add(conn);
            extractChildren(s, spans, upstream, conns, count);
            upstream.remove(upstream.size() - 1);
          } else {
            extractChildren(s, spans, upstream, conns, count);
          }
        }
      } else {
        // no connection found
        def conn = new HashMap();
        conn.caller = caller;
        conn.upstream = new ArrayList(upstream);
        conn.upstream.add(caller.service_name + "/" + caller.environment);
        conns.add(conn);
      }
    }

    def conns = new HashSet();
    def spans = new HashMap();

    // merge results from shards
    for (state in states) {
      for (s in state.entrySet()) {
        def v = s.getValue();
        def k = s.getKey();
        if (!spans.containsKey(k)) {
          spans[k] = v;
        } else {
          for (p in v) {
            spans[k].add(p);
          }
        }
      }
    }

    if (spans.containsKey(null) && spans[null].size() > 0) {
      def node = spans[null][0];
      def upstream = new ArrayList();
      extractChildren(node, spans, upstream, conns, 0);
      return new ArrayList(conns)
    }

    return [];
  `
};

export const combineServiceConnsScript = {
  lang: 'painless',
  source: `return state.spans`
};
