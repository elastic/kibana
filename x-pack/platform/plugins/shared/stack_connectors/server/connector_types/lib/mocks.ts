/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { AxiosResponse } from 'axios';
import { SubActionConnector } from '@kbn/actions-plugin/server';
import { SubActionRequestParams } from '@kbn/actions-plugin/server/sub_action_framework/types';
import { ConnectorUsageCollector } from '@kbn/actions-plugin/server/usage';

/**
 * Create an Axios response object mock
 *
 * @param data
 * @param status
 * @param statusText
 */
export const createAxiosResponseMock = <R>(
  data: R,
  status = 200,
  statusText = 'ok'
): AxiosResponse<R> => {
  return {
    data,
    status,
    statusText,
    headers: {},
    // @ts-expect-error
    config: {},
  };
};

export type ConnectorInstanceMock<T extends SubActionConnector<any, any>> = jest.Mocked<
  T & {
    // Protected methods that will also be exposed for testing purposes
    request: SubActionConnector<any, any>['request'];
  }
>;

/**
 * Creates an instance of the Connector class that is passed in and wraps it in a `Proxy`, and
 * intercepts calls to public methods (and a few protected methods) and wraps those in `jest.fn()` so
 * that they can be mocked.
 *
 * For an example on the usage of this factory function, see the Mocks for Microsoft Defender for Endpoint connector.
 *
 * @param ConnectorClass
 * @param constructorArguments
 */
export const createConnectorInstanceMock = <T extends typeof SubActionConnector<any, any>>(
  ConnectorClass: T,
  constructorArguments: ConstructorParameters<T>[0]
): ConnectorInstanceMock<InstanceType<T>> => {
  const requestMock = jest.fn();

  const ConnectorClassExtended =
    // @ts-expect-error
    class extends ConnectorClass {
      public async request<R>(
        params: SubActionRequestParams<R>,
        usageCollector: ConnectorUsageCollector
      ): Promise<AxiosResponse<R>> {
        return requestMock(params, usageCollector);
      }
    };
  // @ts-expect-error
  const instance = new ConnectorClassExtended(constructorArguments);
  const mockedMethods: { [K in keyof InstanceType<T>]?: jest.Mock } = { request: requestMock };
  const instanceAccessorHandler: ProxyHandler<InstanceType<T>> = {};
  const proxiedInstance = new Proxy(instance, instanceAccessorHandler) as ConnectorInstanceMock<
    InstanceType<T>
  >;

  instanceAccessorHandler.get = function (target, prop, receiver) {
    if (typeof instance[prop] === 'function') {
      if (!mockedMethods[prop as keyof InstanceType<T>]) {
        mockedMethods[prop as keyof InstanceType<T>] = jest.fn(
          instance[prop].bind(proxiedInstance) // << Magic sauce!
        );
      }

      return mockedMethods[prop as keyof InstanceType<T>];
    }

    // @ts-expect-error TS2556: A spread argument must either have a tuple type or be passed to a rest parameter.
    // eslint-disable-next-line prefer-rest-params
    return Reflect.get(...arguments);
  };

  return proxiedInstance;
};
