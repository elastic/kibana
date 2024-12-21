/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ResolvedSimpleSavedObject, SavedObject } from '@kbn/core/public';
import {
  API_ROUTE_SHAREABLE_ZIP,
  API_ROUTE_TEMPLATES,
  API_ROUTE_WORKPAD,
  API_ROUTE_WORKPAD_ASSETS,
  API_ROUTE_WORKPAD_STRUCTURES,
  DEFAULT_WORKPAD_CSS,
} from '../../common/lib';
import type { CanvasRenderedWorkpad } from '../../shareable_runtime/types';
import { CanvasTemplate, CanvasWorkpad } from '../../types';
import { coreServices } from './kibana_services';

export type FoundWorkpads = Array<Pick<CanvasWorkpad, 'name' | 'id' | '@timestamp' | '@created'>>;
export type FoundWorkpad = FoundWorkpads[number];
export interface WorkpadFindResponse {
  total: number;
  workpads: FoundWorkpads;
}

export interface TemplateFindResponse {
  templates: CanvasTemplate[];
}

export interface ResolveWorkpadResponse {
  workpad: CanvasWorkpad;
  outcome: ResolvedSimpleSavedObject['outcome'];
  aliasId?: ResolvedSimpleSavedObject['alias_target_id'];
  aliasPurpose?: ResolvedSimpleSavedObject['alias_purpose'];
}

/*
  Remove any top level keys from the workpad which will be rejected by validation
*/
const validKeys = [
  '@created',
  '@timestamp',
  'assets',
  'colors',
  'css',
  'variables',
  'height',
  'id',
  'isWriteable',
  'name',
  'page',
  'pages',
  'width',
];

const sanitizeWorkpad = function (workpad: CanvasWorkpad) {
  const workpadKeys = Object.keys(workpad);

  for (const key of workpadKeys) {
    if (!validKeys.includes(key)) {
      delete (workpad as { [key: string]: any })[key];
    }
  }

  return workpad;
};

class CanvasWorkpadService {
  private apiPath = `${API_ROUTE_WORKPAD}`;

  public async get(id: string): Promise<CanvasWorkpad> {
    const workpad = await coreServices.http.get<any>(`${this.apiPath}/${id}`, { version: '1' });

    return { css: DEFAULT_WORKPAD_CSS, variables: [], ...workpad };
  }

  public async export(id: string) {
    const workpad = await coreServices.http.get<SavedObject<CanvasWorkpad>>(
      `${this.apiPath}/export/${id}`,
      { version: '1' }
    );
    const { attributes } = workpad;

    return {
      ...workpad,
      attributes: {
        ...attributes,
        css: attributes.css ?? DEFAULT_WORKPAD_CSS,
        variables: attributes.variables ?? [],
      },
    };
  }

  public async resolve(id: string): Promise<ResolveWorkpadResponse> {
    const { workpad, ...resolveProps } = await coreServices.http.get<ResolveWorkpadResponse>(
      `${this.apiPath}/resolve/${id}`,
      { version: '1' }
    );

    return {
      ...resolveProps,
      workpad: {
        // @ts-ignore: Shimming legacy workpads that might not have CSS
        css: DEFAULT_WORKPAD_CSS,
        // @ts-ignore: Shimming legacy workpads that might not have variables
        variables: [],
        ...workpad,
      },
    };
  }

  public async create(workpad: CanvasWorkpad): Promise<CanvasWorkpad> {
    return coreServices.http.post(this.apiPath, {
      body: JSON.stringify({
        ...sanitizeWorkpad({ ...workpad }),
        assets: workpad.assets || {},
        variables: workpad.variables || [],
      }),
      version: '1',
    });
  }

  public async import(workpad: CanvasWorkpad): Promise<CanvasWorkpad> {
    return coreServices.http.post(`${this.apiPath}/import`, {
      body: JSON.stringify({
        ...sanitizeWorkpad({ ...workpad }),
        assets: workpad.assets || {},
        variables: workpad.variables || [],
      }),
      version: '1',
    });
  }

  public async createFromTemplate(templateId: string): Promise<CanvasWorkpad> {
    return coreServices.http.post(this.apiPath, {
      body: JSON.stringify({ templateId }),
      version: '1',
    });
  }

  public async findTemplates(): Promise<TemplateFindResponse> {
    return coreServices.http.get(API_ROUTE_TEMPLATES, { version: '1' });
  }

  public async find(searchTerm: string): Promise<WorkpadFindResponse> {
    // TODO: this shouldn't be necessary.  Check for usage.
    const validSearchTerm = typeof searchTerm === 'string' && searchTerm.length > 0;

    return coreServices.http.get(`${this.apiPath}/find`, {
      query: {
        perPage: 10000,
        name: validSearchTerm ? searchTerm : '',
      },
      version: '1',
    });
  }

  public async remove(id: string) {
    coreServices.http.delete(`${this.apiPath}/${id}`, { version: '1' });
  }

  public async update(id: string, workpad: CanvasWorkpad) {
    coreServices.http.put(`${this.apiPath}/${id}`, {
      body: JSON.stringify({ ...sanitizeWorkpad({ ...workpad }) }),
      version: '1',
    });
  }

  public async updateWorkpad(id: string, workpad: CanvasWorkpad) {
    coreServices.http.put(`${API_ROUTE_WORKPAD_STRUCTURES}/${id}`, {
      body: JSON.stringify({ ...sanitizeWorkpad({ ...workpad }) }),
      version: '1',
    });
  }

  public async updateAssets(id: string, assets: CanvasWorkpad['assets']) {
    coreServices.http.put(`${API_ROUTE_WORKPAD_ASSETS}/${id}`, {
      body: JSON.stringify(assets),
      version: '1',
    });
  }

  public async getRuntimeZip(workpad: CanvasRenderedWorkpad): Promise<Blob> {
    return coreServices.http.post<Blob>(API_ROUTE_SHAREABLE_ZIP, {
      body: JSON.stringify(workpad),
      version: '1',
    });
  }
}

let canvasWorkpadService: CanvasWorkpadService;

export const getCanvasWorkpadService: () => CanvasWorkpadService = () => {
  if (!canvasWorkpadService) {
    canvasWorkpadService = new CanvasWorkpadService();
  }
  return canvasWorkpadService;
};
