/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { CSSProperties } from 'react';
import React, { memo, useCallback } from 'react';
import { EuiAvatar, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import type { EuiAvatarProps } from '@elastic/eui';

const MIN_WIDTH: CSSProperties = { minWidth: 0 };

/**
 * Shows a user's name along with an avatar. Name is truncated if its wider than the availble space
 */
export const Persona = memo<EuiAvatarProps>(
  ({ name, className, 'data-test-subj': dataTestSubj, title, ...otherAvatarProps }) => {
    const getTestId = useCallback(
      (suffix: any) => {
        if (dataTestSubj) {
          return `${dataTestSubj}-${suffix}`;
        }
      },
      [dataTestSubj]
    );
    return (
      <EuiFlexGroup
        gutterSize="s"
        alignItems="baseline"
        style={MIN_WIDTH}
        className={className}
        data-test-subj={dataTestSubj}
        title={title}
        responsive={false}
      >
        <EuiFlexItem grow={false}>
          <EuiAvatar name={name} data-test-subj={getTestId('avatar')} {...otherAvatarProps} />
        </EuiFlexItem>
        <EuiFlexItem grow={false} className="eui-textTruncate">
          <EuiText size="s" className="eui-textTruncate" data-test-subj={getTestId('name')}>
            {name}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);
