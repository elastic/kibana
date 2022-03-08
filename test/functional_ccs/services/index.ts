/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { services as functionalServices } from '../../functional/services';
import { RemoteEsProvider } from './remote_es';
import { RemoteEsArchiverProvider } from './remote_es_archiver';

export const services = {
  ...functionalServices,
  remoteEs: RemoteEsProvider,
  remoteEsArchiver: RemoteEsArchiverProvider,
};
