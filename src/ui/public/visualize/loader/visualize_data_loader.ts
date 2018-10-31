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

import { VisRequestHandlersRegistryProvider as RequestHandlersProvider } from '../../registry/vis_request_handlers';
import { VisResponseHandlersRegistryProvider as ResponseHandlerProvider } from '../../registry/vis_response_handlers';

import { IPrivate } from '../../private';
import {
  RequestHandler,
  RequestHandlerDescription,
  RequestHandlerParams,
  ResponseHandler,
  ResponseHandlerDescription,
  Vis,
} from '../../vis';

// @ts-ignore No typing present
import { isTermSizeZeroError } from '../../elasticsearch_errors';

import { toastNotifications } from 'ui/notify';

function getHandler<T extends RequestHandler | ResponseHandler>(
  from: Array<{ name: string; handler: T }>,
  type: string | T
): T {
  if (typeof type === 'function') {
    return type;
  }
  const handlerDesc = from.find(handler => handler.name === type);
  if (!handlerDesc) {
    throw new Error(`Could not find handler "${type}".`);
  }
  return handlerDesc.handler;
}

export class VisualizeDataLoader {
  private requestHandler: RequestHandler;
  private responseHandler: ResponseHandler;

  private visData: any;
  private previousVisState: any;
  private previousRequestHandlerResponse: any;

  constructor(private readonly vis: Vis, Private: IPrivate) {
    const { requestHandler, responseHandler } = vis.type;

    const requestHandlers: RequestHandlerDescription[] = Private(RequestHandlersProvider);
    const responseHandlers: ResponseHandlerDescription[] = Private(ResponseHandlerProvider);
    this.requestHandler = getHandler(requestHandlers, requestHandler);
    this.responseHandler = getHandler(responseHandlers, responseHandler);
  }

  public async fetch(params: RequestHandlerParams): Promise<any> {
    this.vis.filters = { timeRange: params.timeRange };
    this.vis.requestError = undefined;
    this.vis.showRequestError = false;

    try {
      // searchSource is only there for courier request handler
      const requestHandlerResponse = await this.requestHandler(this.vis, {
        partialRows: this.vis.params.partialRows || this.vis.type.requiresPartialRows,
        ...params,
      });

      // No need to call the response handler when there have been no data nor has been there changes
      // in the vis-state (response handler does not depend on uiStat
      const canSkipResponseHandler =
        this.previousRequestHandlerResponse &&
        this.previousRequestHandlerResponse === requestHandlerResponse &&
        this.previousVisState &&
        isEqual(this.previousVisState, this.vis.getState());

      this.previousVisState = this.vis.getState();
      this.previousRequestHandlerResponse = requestHandlerResponse;

      if (!canSkipResponseHandler) {
        this.visData = await Promise.resolve(this.responseHandler(requestHandlerResponse));
      }
      return this.visData;
    } catch (error) {
      params.searchSource.cancelQueued();
      this.vis.requestError = error;
      this.vis.showRequestError = error.type && error.type === 'UNSUPPORTED_QUERY';
      // tslint:disable-next-line
      console.error(error);
      if (isTermSizeZeroError(error)) {
        return toastNotifications.addDanger(
          `Your visualization ('${this.vis.title}') has an error: it has a term ` +
            `aggregation with a size of 0. Please set it to a number greater than 0 to resolve ` +
            `the error.`
        );
      }
      toastNotifications.addDanger({
        title: 'Error in visualization',
        text: error.message,
      });
    }
  }
}
