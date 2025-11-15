/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ISearchSource, ISearchStartSearchSource } from '@kbn/data-plugin/common';

/**
 * Recursively creates a proxy for a SearchSource instance to intercept `fetch` and `createChild` calls.
 * @param searchSource The SearchSource instance to wrap.
 * @param interactions The array to store captured data in.
 * @returns A proxied ISearchSource instance.
 */
function createSearchSourceProxy(
  searchSource: ISearchSource,
  interactions: Array<any> // Using 'any' for now to match the flexible structure
): ISearchSource {
  return new Proxy(searchSource, {
    get(target, prop, receiver) {
      const originalMethod = Reflect.get(target, prop, receiver);

      // Intercept the 'fetch' method to capture request and response
      if (prop === 'fetch' && typeof originalMethod === 'function') {
        return async (...fetchArgs: any[]) => {
          const requestBody = target.getSearchRequestBody(); // Get the Elasticsearch query body

          // Execute the original fetch to get the parsed ISearchResponse
          const searchResponse = await originalMethod.apply(target, fetchArgs);

          // Construct the object to match the desired structure as closely as possible
          const formattedInteraction = {
            // 'params' in the user's example likely refers to the full Elasticsearch client request object.
            // From searchSource.fetch(), we primarily get the request body.
            // We'll make assumptions for method and path, as they are not directly exposed here.
            params: {
              body: JSON.stringify(requestBody),
              method: 'POST', // SearchSource.fetch() typically performs a POST request
              path: '_search', // SearchSource.fetch() typically targets the _search endpoint
              // Other parameters like index, type, etc., would be part of the 'body'
            },
            response: {
              body: searchResponse,
              statusCode: 200,
            },
            // response: {
            //   body: searchResponse.rawResponse, // ISearchResponse contains the raw Elasticsearch response body
            //   // The HTTP status code is not directly available from ISearchResponse
            //   statusCode: undefined, // Cannot be retrieved at this abstraction level
            // },
          };

          interactions.push(formattedInteraction);

          // Return the original response to not break the execution flow
          return searchResponse;
        };
      }

      // Intercept 'createChild' to ensure the child is also proxied
      if (prop === 'createChild' && typeof originalMethod === 'function') {
        return (...childArgs: any[]) => {
          const realChild = originalMethod.apply(target, childArgs);
          // Recursive call to wrap the child in the same proxy logic
          return createSearchSourceProxy(realChild, interactions);
        };
      }

      return originalMethod;
    },
  });
}

/**
 * Wraps an ISearchStartSearchSource factory to intercept calls to SearchSource instances it creates.
 * This allows capturing the request and response from `searchSource.fetch()` calls, including on child search sources.
 *
 * @param searchSourceClient The original ISearchStartSearchSource factory from the Data plugin.
 * @param interactions An array where the captured { request, response } pairs will be stored.
 * @returns A proxied ISearchStartSearchSource factory.
 */
export function searchSourceInspector(
  searchSourceClient: ISearchStartSearchSource,
  interactions: Array<any> // Using 'any' for now to match the flexible structure
): ISearchStartSearchSource {
  return new Proxy(searchSourceClient, {
    get(factoryTarget, factoryProp, factoryReceiver) {
      const originalFactoryMethod = Reflect.get(factoryTarget, factoryProp, factoryReceiver);

      // Intercept methods that create the initial SearchSource instance
      if (
        (factoryProp === 'create' || factoryProp === 'createLazy') &&
        typeof originalFactoryMethod === 'function'
      ) {
        return async (...args: any[]) => {
          const realSearchSource = await originalFactoryMethod.apply(factoryTarget, args);
          // Apply the recursive proxy to the first SearchSource instance
          return createSearchSourceProxy(realSearchSource, interactions);
        };
      }
      return originalFactoryMethod;
    },
  });
}
