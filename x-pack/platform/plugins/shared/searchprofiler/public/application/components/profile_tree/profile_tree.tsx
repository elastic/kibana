/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, Fragment } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

import { IndexDetails } from './index_details';
import { ShardDetails } from './shard_details';
import { initDataFor } from './init_data';
import type { Targets, ShardSerialized, Index } from '../../types';
import type { OnHighlightChangeArgs } from './highlight_context';
import { HighlightContextProvider } from './highlight_context';

export interface Props {
  target: Targets;
  data: ShardSerialized[] | null;
  onHighlight: (args: OnHighlightChangeArgs) => void;
  onDataInitError: (error: Error) => void;
}

const useStyles = () => {
  const { euiTheme } = useEuiTheme();

  return {
    // Main profile tree container
    container: css`
      height: 100%;
      overflow-y: auto;
      flex-grow: 1;
    `,

    // Index panel container
    indexPanel: css`
      width: 100%;
      padding: ${euiTheme.size.base} ${euiTheme.size.s};
      border-bottom: ${euiTheme.border.thin};
    `,
  };
};

export const ProfileTree = memo(({ data, target, onHighlight, onDataInitError }: Props) => {
  const styles = useStyles();
  let content = null;

  if (data && data.length) {
    try {
      const sortedIndices: Index[] = initDataFor(target)(data);
      content = (
        <HighlightContextProvider onHighlight={onHighlight}>
          <EuiFlexGroup gutterSize="none" direction="column">
            {sortedIndices.map((index) => (
              <EuiFlexItem key={index.name} grow={false}>
                <EuiFlexGroup
                  css={styles.indexPanel}
                  gutterSize="none"
                  key={index.name}
                  direction="column"
                >
                  <EuiFlexItem grow={false}>
                    <IndexDetails index={index} />
                  </EuiFlexItem>
                  <EuiSpacer size="s" />
                  <EuiFlexItem grow={false}>
                    {index.shards.map((shard, idx) => (
                      <Fragment key={shard.id[1] + `_${idx}`}>
                        <ShardDetails index={index} shard={shard} operations={shard[target]!} />
                        {idx < index.shards.length - 1 ? <EuiSpacer size="s" /> : undefined}
                      </Fragment>
                    ))}
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        </HighlightContextProvider>
      );
    } catch (e) {
      onDataInitError(e);
    }
  }

  return (
    <div data-test-subj="profileTree" css={styles.container}>
      {content}
    </div>
  );
});
