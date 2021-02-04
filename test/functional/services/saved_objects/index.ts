/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { fetchSavedObjects, fetchList } from './fetch_saved_objects';
import { importSavedObjects, importList } from './import_saved_objects';
import { FtrProviderContext } from '../../../common/ftr_provider_context';

export const SavedObjectsProvider = ({ getService }: FtrProviderContext) => {
  const config = getService('config');
  const dataDir = config.get('savedObjects.directory');

  return {
    fetch: fetchSavedObjects(dataDir),
    import: importSavedObjects(dataDir),
    fetchList: fetchList(dataDir),
    importList: importList(dataDir),
  };
};
