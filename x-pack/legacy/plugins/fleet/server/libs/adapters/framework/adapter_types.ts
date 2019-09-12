/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Legacy } from 'kibana';
import { ResponseToolkit, ResponseObject } from 'hapi';
import { Request, SavedObjectsClient } from 'src/legacy/server/kbn_server';

export type KibanaLegacyServer = Legacy.Server;

export interface FrameworkAdapter {
  getSetting(settingPath: string): string;
}

export interface FrameworkRequest<KibanaServerRequestGenaric extends Partial<Request> = any> {
  query: KibanaServerRequestGenaric['query'];
  params: KibanaServerRequestGenaric['params'];
  payload: KibanaServerRequestGenaric['payload'];
  headers: KibanaServerRequestGenaric['headers'];
  getSavedObjectsClient: () => SavedObjectsClient;
}

export type FrameworkResponseToolkit = ResponseToolkit;

export type FrameworkResponseObject = ResponseObject;
