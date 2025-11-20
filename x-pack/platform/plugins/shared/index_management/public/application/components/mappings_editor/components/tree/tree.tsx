/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { useEuiTheme } from '@elastic/eui';

import { TreeItem as TreeItemComponent } from './tree_item';

export interface TreeItem {
  label: string | JSX.Element;
  children?: TreeItem[];
}

interface Props {
  tree: TreeItem[];
}

const useStyles = () => {
  const { euiTheme } = useEuiTheme();
  return {
    esUiTree: css`
      padding: 0;
      margin: 0;
      list-style-type: none;
      position: relative;
      padding-top: ${euiTheme.size.xs};
    `,
  };
};

export const Tree = ({ tree }: Props) => {
  const styles = useStyles();
  return (
    <ul css={styles.esUiTree}>
      {tree.map((treeItem, i) => (
        <TreeItemComponent key={i} treeItem={treeItem} />
      ))}
    </ul>
  );
};
