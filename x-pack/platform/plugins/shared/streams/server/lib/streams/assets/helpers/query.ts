/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v5 } from 'uuid';
import { QueryLink } from '../../../../../common/assets';
import { getUuid } from '../asset_client';
import { ASSET_UUID } from '../fields';

export function getRuleIdFromQueryLink(query: Pick<QueryLink, 'asset.uuid'>) {
  return v5(query[ASSET_UUID], v5.DNS);
}

export function getRuleIdFromAsset(
  name: string,
  asset: Pick<QueryLink, 'asset.id' | 'asset.type'>
) {
  return v5(getUuid(name, asset), v5.DNS);
}
