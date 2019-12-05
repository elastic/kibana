/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsClientContract } from 'src/core/server/';
import { Asset, Datasource, InputType } from '../../../ingest/server/libs/types';
import { SAVED_OBJECT_TYPE_DATASOURCES } from '../../common/constants';
import { AssetReference } from '../../common/types';
import { CallESAsCurrentUser } from '../lib/cluster_access';
import { installPipelines } from '../lib/elasticsearch/ingest_pipeline/ingest_pipelines';
import { installTemplates } from '../lib/elasticsearch/template/install';
import * as Registry from '../registry';

export async function createDatasource(options: {
  savedObjectsClient: SavedObjectsClientContract;
  pkgkey: string;
  callCluster: CallESAsCurrentUser;
}) {
  const { savedObjectsClient, pkgkey, callCluster } = options;
  const toSave = await installPipelines({ pkgkey, callCluster });
  // TODO: Clean up
  const info = await Registry.fetchInfo(pkgkey);
  await installTemplates(info, callCluster);

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
  const savedRefs = savedObject?.attributes.package.assets;
  const mergeRefsReducer = (current: Asset[] = [], pending: Asset) => {
    const hasRef = current.find(c => c.id === pending.id && c.type === pending.type);
    if (!hasRef) current.push(pending);
    return current;
  };

  const toInstall = (toSave as Asset[]).reduce(mergeRefsReducer, savedRefs);
  const datasource: Datasource = createFakeDatasource(pkgkey, toInstall);
  await savedObjectsClient.create<Datasource>(SAVED_OBJECT_TYPE_DATASOURCES, datasource, {
    id: pkgkey,
    overwrite: true,
  });

  return toInstall;
}

export async function getDatasourceObject(options: {
  savedObjectsClient: SavedObjectsClientContract;
  pkgkey: string;
}) {
  const { savedObjectsClient, pkgkey } = options;
  return savedObjectsClient
    .get<Datasource>(SAVED_OBJECT_TYPE_DATASOURCES, pkgkey)
    .catch(e => undefined);
}

function createFakeDatasource(pkgkey: string, assets: Asset[] = []): Datasource {
  return {
    id: pkgkey,
    name: 'name',
    read_alias: 'read_alias',
    package: {
      name: 'name',
      version: '1.0.1, 1.3.1',
      description: 'description',
      title: 'title',
      assets: assets as Asset[],
    },
    streams: [
      {
        id: 'string',
        input: {
          type: InputType.Log,
          config: { config: 'values', go: 'here' },
          ingest_pipelines: ['string'],
          id: 'string',
          index_template: 'string',
          ilm_policy: 'string',
          fields: [{}],
        },
        config: { config: 'values', go: 'here' },
        output_id: 'output_id',
        processors: ['string'],
      },
    ],
  };
}
