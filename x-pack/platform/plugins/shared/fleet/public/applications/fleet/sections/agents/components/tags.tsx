/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiToolTip, EuiText, type EuiTextProps } from '@elastic/eui';
import { take } from 'lodash';
import React from 'react';
import styled from 'styled-components';

import { truncateTag } from '../agent_list_page/utils';

const Wrapped = styled.div`
  display: flex;
  .wrappedText {
    white-space: pre-wrap;
  }
`;

interface Props {
  tags: string[];
  color?: EuiTextProps['color'];
  size?: EuiTextProps['size'];
}

// Number of tags displayed before "+ N more" is displayed
const MAX_TAGS_TO_DISPLAY = 3;

export const Tags: React.FunctionComponent<Props> = ({ tags, color, size }) => {
  return (
    <>
      <Wrapped>
        <EuiToolTip
          anchorClassName={'wrappedText'}
          content={<span data-test-subj="agentTagsTooltip">{tags.join(', ')}</span>}
        >
          <EuiText size={size} color={color}>
            <span data-test-subj="agentTags">
              {take(tags, 3).map(truncateTag).join(', ')}
              {tags.length > MAX_TAGS_TO_DISPLAY
                ? ` + ${tags.length - MAX_TAGS_TO_DISPLAY} more`
                : ''}
            </span>
          </EuiText>
        </EuiToolTip>
      </Wrapped>
    </>
  );
};
