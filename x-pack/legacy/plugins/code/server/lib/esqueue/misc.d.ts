/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface AnyObject {
  [key: string]: any;
}

export interface EsClient {
  indices: {
    exists(params: AnyObject): Promise<any>;
    create(params: AnyObject): Promise<any>;
    refresh(params: AnyObject): Promise<any>;
    delete(params: AnyObject): Promise<any>;

    existsAlias(params: AnyObject): Promise<any>;
    getAlias(params: AnyObject): Promise<any>;
    putAlias(params: AnyObject): Promise<any>;
    deleteAlias(params: AnyObject): Promise<any>;
    updateAliases(params: AnyObject): Promise<any>;

    getMapping(params: AnyObject): Promise<any>;
  };

  ping(): Promise<void>;
  bulk(params: AnyObject): Promise<any>;
  index(params: AnyObject): Promise<any>;
  get(params: AnyObject): Promise<any>;
  update(params: AnyObject): Promise<any>;
  reindex(params: AnyObject): Promise<any>;
  search(params: AnyObject): Promise<any>;
  delete(params: AnyObject): Promise<any>;
  deleteByQuery(params: AnyObject): Promise<any>;
  updateByQuery(params: AnyObject): Promise<any>;
}

export type LogFn = (msg: string | Error, tags: string[]) => void;
