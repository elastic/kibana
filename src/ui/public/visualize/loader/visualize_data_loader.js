/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import { isEqual } from 'lodash';
import { VisRequestHandlersRegistryProvider } from '../../registry/vis_request_handlers';
import { VisResponseHandlersRegistryProvider } from '../../registry/vis_response_handlers';

import {
  isTermSizeZeroError,
} from '../../elasticsearch_errors';

import { toastNotifications } from 'ui/notify';

function getHandler(from, name) {
  if (typeof name === 'function') return name;
  return from.find(handler => handler.name === name).handler;
}

export class VisualizeDataLoader {
  constructor(vis, Private) {
    this._vis = vis;

    const { requestHandler, responseHandler } = this._vis.type;

    const requestHandlers = Private(VisRequestHandlersRegistryProvider);
    const responseHandlers = Private(VisResponseHandlersRegistryProvider);
    this._requestHandler = getHandler(requestHandlers, requestHandler);
    this._responseHandler = getHandler(responseHandlers, responseHandler);
  }

  fetch = async (props, forceFetch = false) => {

    this._vis.filters = { timeRange: props.timeRange };

    const handlerParams = { ...props, forceFetch };

    try {
      // searchSource is only there for courier request handler
      const requestHandlerResponse = await this._requestHandler(this._vis, handlerParams);

      //No need to call the response handler when there have been no data nor has been there changes
      //in the vis-state (response handler does not depend on uiStat
      const canSkipResponseHandler = (
        this._previousRequestHandlerResponse && this._previousRequestHandlerResponse === requestHandlerResponse &&
        this._previousVisState && isEqual(this._previousVisState, this._vis.getState())
      );

      this._previousVisState = this._vis.getState();
      this._previousRequestHandlerResponse = requestHandlerResponse;

      if (!canSkipResponseHandler) {
        this._visData = await Promise.resolve(this._responseHandler(this._vis, requestHandlerResponse));
      }
      return this._visData;
    }
    catch (e) {
      this._vis.searchSource.cancelQueued();
      this._vis.requestError = e;
      if (isTermSizeZeroError(e)) {
        return toastNotifications.addDanger(
          `Your visualization ('${props.vis.title}') has an error: it has a term ` +
          `aggregation with a size of 0. Please set it to a number greater than 0 to resolve ` +
          `the error.`
        );
      }
      toastNotifications.addDanger(e);
    }
  }

}
