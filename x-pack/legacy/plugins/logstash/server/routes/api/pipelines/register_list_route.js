/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { wrapEsError } from '../../../lib/error_wrappers';
import { callWithRequestFactory } from '../../../lib/call_with_request_factory';
import { fetchAllFromScroll } from '../../../lib/fetch_all_from_scroll';
import { INDEX_NAMES, ES_SCROLL_SETTINGS } from '../../../../common/constants';
import { PipelineListItem } from '../../../models/pipeline_list_item';
import { licensePreRoutingFactory } from '../../../lib/license_pre_routing_factory';

function fetchPipelines(callWithRequest) {
  const params = {
    index: INDEX_NAMES.PIPELINES,
    scroll: ES_SCROLL_SETTINGS.KEEPALIVE,
    body: {
      size: ES_SCROLL_SETTINGS.PAGE_SIZE,
    },
    ignore: [404],
  };

  return callWithRequest('search', params).then(response =>
    fetchAllFromScroll(response, callWithRequest)
  );
}

export function registerListRoute(server) {
  const licensePreRouting = licensePreRoutingFactory(server);

  server.route({
    path: '/api/logstash/pipelines',
    method: 'GET',
    handler: request => {
      const callWithRequest = callWithRequestFactory(server, request);

      return fetchPipelines(callWithRequest)
        .then((pipelinesHits = []) => {
          const pipelines = pipelinesHits.map(pipeline => {
            return PipelineListItem.fromUpstreamJSON(pipeline).downstreamJSON;
          });

          return { pipelines };
        })
        .catch(e => wrapEsError(e));
    },
    config: {
      pre: [licensePreRouting],
    },
  });
}
