/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiBadge, EuiBadgeProps } from '@elastic/eui';
import React from 'react';
import { TABLE_CONFIG } from '../../../common/constants';

type TagBadgeProps = EuiBadgeProps & {
  maxIdRenderSize?: number;
  tag: { name: string; color: string; disabled?: boolean; id: string };
};

export const TagBadge = (props: TagBadgeProps) => {
  const { iconType, onClick, onClickAriaLabel, tag } = props;
  const maxIdRenderSize = props.maxIdRenderSize || TABLE_CONFIG.TRUNCATE_TAG_LENGTH;
  const idToRender = `${tag.name.substring(0, maxIdRenderSize)}${
    tag.name.length > maxIdRenderSize ? '...' : ''
  }`;

  if (tag.disabled) {
    return (
      <EuiBadge color="default" iconType="cross">
        {idToRender}
      </EuiBadge>
    );
  } else if (onClick && onClickAriaLabel) {
    return (
      <EuiBadge
        color={tag.color || 'primary'}
        iconType={iconType}
        onClick={onClick}
        onClickAriaLabel={onClickAriaLabel}
      >
        {idToRender}
      </EuiBadge>
    );
  } else {
    return (
      <EuiBadge color={tag.color || 'primary'} iconType={iconType}>
        {idToRender}
      </EuiBadge>
    );
  }
};
