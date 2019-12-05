/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsClientContract } from 'kibana/server';

export async function installIndexPattern(
  name: string,
  savedObjectsClient: SavedObjectsClientContract
) {
  await savedObjectsClient.create('index-pattern', getData(name));
}

function getData(name: string) {
  return {
    title: name + '-*',
  };
}
