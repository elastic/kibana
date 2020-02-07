/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ScopedClusterClient, IRouter } from 'src/core/server';
import { LicensingPluginSetup } from '../../../../plugins/licensing/server';
import { License, IndexDataEnricher } from './services';
import { isEsError } from './lib/is_es_error';

export interface Dependencies {
  licensing: LicensingPluginSetup;
}

export interface RouteDependencies {
  router: IRouter;
  license: License;
  indexDataEnricher: IndexDataEnricher;
  lib: {
    isEsError: typeof isEsError;
  };
}

export interface Index {
  health: string;
  status: string;
  name: string;
  uuid: string;
  primary: string;
  replica: string;
  documents: any;
  size: any;
  isFrozen: boolean;
  aliases: string | string[];
  [key: string]: any;
}

export type CallAsCurrentUser = ScopedClusterClient['callAsCurrentUser'];
