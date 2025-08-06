/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SavedObjectToBe, InstallAssetContext } from './install';
import { getPackageTagId, getManagedTagId } from './tag_assets';

export function fillAlertDefaults(alertSo: Partial<SavedObjectToBe>, context: InstallAssetContext) {
  const currentDateTime = new Date().toISOString();
  const tags = getTags(alertSo.id!, context);
  const existingTags = Array.isArray((alertSo.attributes as Record<string, unknown>).tags)
    ? ((alertSo.attributes as Record<string, unknown>).tags as string[])
    : [];

  // Based on x-pack/platform/plugins/shared/alerting/server/application/rule/methods/create/create_rule.ts
  const newSo = {
    ...alertSo,
    attributes: {
      ...(alertSo.attributes ?? {}),
      enabled: false,
      revision: 0,
      executionStatus: {
        status: 'pending',
        lastExecutionDate: currentDateTime,
      },
      createdAt: currentDateTime,
      updatedAt: currentDateTime,
      running: false,
      tags: [...new Set([...existingTags, ...tags])],
    },
  };

  return newSo;
}

function getTags(id: string, context: InstallAssetContext) {
  const { pkgName, spaceId, assetTags } = context;
  const tags = [getPackageTagId(spaceId, pkgName), getManagedTagId(spaceId)];

  if (!assetTags || assetTags.length === 0) {
    return tags;
  }

  const filteredAssetTags = assetTags.reduce<string[]>((_assetTags, assetTag) => {
    if (assetTag.asset_types?.includes('alert') || assetTag.asset_ids?.includes(id)) {
      return [..._assetTags, assetTag.text];
    }
    return _assetTags;
  }, []);

  return [...tags, ...filteredAssetTags];
}
