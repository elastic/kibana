/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isPopulatedObject } from '@kbn/ml-is-populated-object';

import { ElasticsearchAssetType } from '../../../../../common/types/models';
import { getPathParts } from '../../archive';

interface TransformAliasSetting {
  alias: string;
  // When move_on_creation: true, all the other indices are removed from the alias,
  // ensuring that the alias points at only one index (i.e.: the destination index of the current transform).
  move_on_creation?: boolean;
}
function isTransformAliasSetting(arg: unknown): arg is TransformAliasSetting {
  return isPopulatedObject(arg, ['alias']) && typeof arg.alias === 'string';
}

export const getDestinationIndexAliases = (aliasSettings: unknown): TransformAliasSetting[] => {
  let aliases: TransformAliasSetting[] = [];

  if (!aliasSettings) return aliases;

  if (isPopulatedObject<string, { move_on_creation?: boolean }>(aliasSettings)) {
    Object.keys(aliasSettings).forEach((alias) => {
      if (Object.hasOwn(aliasSettings, alias) && typeof alias === 'string') {
        const moveOnCreation = aliasSettings[alias]?.move_on_creation === true;
        aliases.push({ alias, move_on_creation: moveOnCreation });
      }
    });
  }

  if (Array.isArray(aliasSettings)) {
    aliases = aliasSettings.reduce<TransformAliasSetting[]>((acc, alias) => {
      if (typeof alias === 'string') {
        acc.push({ alias, move_on_creation: alias.endsWith('.latest') ? true : false });
      }

      if (isTransformAliasSetting(alias)) {
        acc.push({ alias: alias.alias, move_on_creation: alias.move_on_creation ?? false });
      }
      return acc;
    }, []);
  }
  if (typeof aliasSettings === 'string') {
    aliases = [
      { alias: aliasSettings, move_on_creation: aliasSettings.endsWith('.latest') ? true : false },
    ];
  }
  return aliases;
};

/**
 * Whether an archive path is installed as a transform asset. `getPathParts` only splits the
 * first four path segments, so this matches any `<pkgkey>/<anything>/transform/<file>` path,
 * with or without a file extension. The package upload validator and the installer must share
 * this predicate: if the validator matched a narrower set of paths, an uploaded archive could
 * place a transform outside `elasticsearch/` and skip validation while still being installed.
 */
export const isTransform = (path: string) => {
  const pathParts = getPathParts(path);
  return !path.endsWith('/') && pathParts.type === ElasticsearchAssetType.transform;
};
