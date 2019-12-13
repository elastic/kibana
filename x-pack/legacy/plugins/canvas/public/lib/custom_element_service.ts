/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AxiosPromise } from 'axios';
// @ts-ignore unconverted local file
import { API_ROUTE_CUSTOM_ELEMENT } from '../../common/lib/constants';
// @ts-ignore unconverted local file
import { fetch } from '../../common/lib/fetch';
import { CustomElement } from '../../types';
import { getCoreStart } from '../legacy';

const getApiPath = function() {
  const basePath = getCoreStart().http.basePath.get();
  return `${basePath}${API_ROUTE_CUSTOM_ELEMENT}`;
};

export const create = (customElement: CustomElement): AxiosPromise =>
  fetch.post(getApiPath(), customElement);

export const get = (customElementId: string): Promise<CustomElement> =>
  fetch
    .get(`${getApiPath()}/${customElementId}`)
    .then(({ data: element }: { data: CustomElement }) => element);

export const update = (id: string, element: CustomElement): AxiosPromise =>
  fetch.put(`${getApiPath()}/${id}`, element);

export const remove = (id: string): AxiosPromise => fetch.delete(`${getApiPath()}/${id}`);

export const find = async (
  searchTerm: string
): Promise<{ total: number; customElements: CustomElement[] }> => {
  const validSearchTerm = typeof searchTerm === 'string' && searchTerm.length > 0;

  return fetch
    .get(`${getApiPath()}/find?name=${validSearchTerm ? searchTerm : ''}&perPage=10000`)
    .then(
      ({ data: customElements }: { data: { total: number; customElements: CustomElement[] } }) =>
        customElements
    );
};
