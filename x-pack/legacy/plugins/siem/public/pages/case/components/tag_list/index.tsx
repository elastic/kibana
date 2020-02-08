/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiText, EuiHorizontalRule, EuiFlexGroup, EuiFlexItem, EuiBadge } from '@elastic/eui';
import styled, { css } from 'styled-components';
import * as i18n from '../../translations';

interface TagListProps {
  tags: string[];
}

const MyFlexGroup = styled(EuiFlexGroup)`
  ${({ theme }) => css`
    margin-top: ${theme.eui.euiSizeM};
  `}
`;

const renderTags = (tags: string[]) => {
  return tags.map((tag, key) => (
    <EuiFlexItem grow={false} key={`${tag}${key}`}>
      <EuiBadge color="hollow">{tag}</EuiBadge>
    </EuiFlexItem>
  ));
};

export const TagList = React.memo(({ tags }: TagListProps) => {
  return (
    <EuiText>
      <h4>{i18n.TAGS}</h4>
      <EuiHorizontalRule margin="xs" />
      <MyFlexGroup> {renderTags(tags)}</MyFlexGroup>
    </EuiText>
  );
});

TagList.displayName = 'TagList';
