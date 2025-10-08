/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { useEuiFontSize, useEuiTheme } from '@elastic/eui';

import type { TreeItem as TreeItemType } from './tree';
import { Tree } from './tree';

interface Props {
  treeItem: TreeItemType;
}

const useStyles = () => {
  const { euiTheme } = useEuiTheme();

  return {
    esUiTreeItem: css`
      list-style-type: none;
      border-left: ${euiTheme.border.thin};
      margin-left: ${euiTheme.size.l};
      padding-bottom: ${euiTheme.size.s};

      &:first-child {
        padding-top: ${euiTheme.size.s};
      }

      &:last-child {
        border-left-color: transparent;
        padding-bottom: 0;
      }
    `,
    esUiTreeItemLabel: css`
      font-size: ${useEuiFontSize('s').fontSize};
      padding-left: ${euiTheme.size.l};
      position: relative;

      &::before {
        content: '';
        position: absolute;
        top: 0;
        left: -1px;
        bottom: 50%;
        width: ${euiTheme.size.base};
        border: ${euiTheme.border.thin};
        border-top: none;
        border-right: none;
      }
    `,
  };
};

export const TreeItem = ({ treeItem }: Props) => {
  const styles = useStyles();
  return (
    <li css={styles.esUiTreeItem}>
      <div css={styles.esUiTreeItemLabel}>{treeItem.label}</div>
      {treeItem.children && <Tree tree={treeItem.children} />}
    </li>
  );
};
