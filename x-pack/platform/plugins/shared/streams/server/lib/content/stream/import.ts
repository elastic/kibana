/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit } from 'lodash';
import type { ContentPackStream } from '@kbn/content-packs-schema';
import type { StreamTree } from './tree';
import { mergeTrees } from './tree';

export function prepareStreamsForImport({
  existing,
  incoming,
}: {
  existing: StreamTree;
  incoming: StreamTree;
}): ContentPackStream[] {
  return flattenTree(mergeTrees({ existing, incoming }));
}

function flattenTree(tree: StreamTree): ContentPackStream[] {
  return [omit(tree, 'children'), ...tree.children.flatMap(flattenTree)];
}
