/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { API_ROUTE_CUSTOM_ELEMENT } from '../../common/lib';
import { CustomElement } from '../../types';
import { coreServices } from './kibana_services';

export interface CustomElementFindResponse {
  total: number;
  customElements: CustomElement[];
}

class CanvasCustomElementService {
  public apiPath = `${API_ROUTE_CUSTOM_ELEMENT}`;

  public async create(customElement: CustomElement) {
    await coreServices.http.post(this.apiPath, {
      body: JSON.stringify(customElement),
      version: '1',
    });
  }

  public async get(customElementId: string): Promise<CustomElement> {
    return await coreServices.http
      .get<{ data: CustomElement }>(`${this.apiPath}/${customElementId}`, { version: '1' })
      .then(({ data: element }) => element);
  }

  public async update(id: string, element: Partial<CustomElement>) {
    await coreServices.http.put(`${this.apiPath}/${id}`, {
      body: JSON.stringify(element),
      version: '1',
    });
  }

  public async remove(id: string) {
    await coreServices.http.delete(`${this.apiPath}/${id}`, { version: '1' });
  }

  public async find(searchTerm: string): Promise<CustomElementFindResponse> {
    return await coreServices.http.get(`${this.apiPath}/find`, {
      query: {
        name: searchTerm,
        perPage: 10000,
      },
      version: '1',
    });
  }
}

let canvasCustomElementService: CanvasCustomElementService;

export const getCustomElementService = () => {
  if (!canvasCustomElementService) {
    canvasCustomElementService = new CanvasCustomElementService();
  }
  return canvasCustomElementService;
};
