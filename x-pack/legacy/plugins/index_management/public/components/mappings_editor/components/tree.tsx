/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';

import { TreeItem as TreeItemType } from '../types';
import { TreeItem } from './tree_item';

interface Props {
  tree: TreeItemType[];
}

export const Tree = ({ tree }: Props) => {
  return (
    <ul className="tree">
      {tree.map(treeItem => (
        <TreeItem key={treeItem.label} treeItem={treeItem} />
      ))}
    </ul>
  );
};
