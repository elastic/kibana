/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsClientContract } from 'src/core/server/';
import { CallESAsCurrentUser } from '../lib/cluster_access';
import { installPipelines } from '../lib/elasticsearch/ingest_pipeline/ingest_pipelines';
import { installTemplates } from '../packages/install';
import { AssetReference } from '../../common/types';
import { SAVED_OBJECT_TYPE_DATASOURCES } from '../../common/constants';
import { Datasource, DatasourceAttributes } from '../../common/types';

export async function createDatasource(options: {
  savedObjectsClient: SavedObjectsClientContract;
  pkgkey: string;
  callCluster: CallESAsCurrentUser;
}) {
  const { savedObjectsClient, pkgkey, callCluster } = options;
  const toSave = await installPipelines({ pkgkey, callCluster });
  // TODO: Clean up
  await installTemplates({ pkgkey, callCluster });

  await saveDatasourceReferences({
    savedObjectsClient,
    pkgkey,
    toSave,
  });

  return toSave;
}

export async function saveDatasourceReferences(options: {
  savedObjectsClient: SavedObjectsClientContract;
  pkgkey: string;
  toSave: AssetReference[];
}) {
  const { savedObjectsClient, pkgkey, toSave } = options;
  const savedObject = await getDatasourceObject({ savedObjectsClient, pkgkey });
  const savedRefs = savedObject && savedObject.attributes.installed;
  const mergeRefsReducer = (current: AssetReference[], pending: AssetReference) => {
    const hasRef = current.find(c => c.id === pending.id && c.type === pending.type);
    if (!hasRef) current.push(pending);
    return current;
  };

  const toInstall = toSave.reduce(mergeRefsReducer, savedRefs || []);

  await savedObjectsClient.create<DatasourceAttributes>(
    SAVED_OBJECT_TYPE_DATASOURCES,
    { installed: toInstall },
    { id: pkgkey, overwrite: true }
  );

  return toInstall;
}

export async function getDatasourceObject(options: {
  savedObjectsClient: SavedObjectsClientContract;
  pkgkey: string;
}): Promise<Datasource | undefined> {
  const { savedObjectsClient, pkgkey } = options;
  return savedObjectsClient
    .get<DatasourceAttributes>(SAVED_OBJECT_TYPE_DATASOURCES, pkgkey)
    .catch(e => undefined);
}
