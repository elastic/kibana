/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import styled from '@emotion/styled';
import { withAttrs } from '../../../utils/theme_utils/with_attrs';
import { TextScale } from '../../../../common/log_text_scale';
import { highlightedContentStyle, hoveredContentStyle, useMonospaceTextStyle } from './text_styles';

export const LogEntryRowWrapper = withAttrs(
  styled.div<LogEntryRowWrapperProps>`
    align-items: stretch;
    color: ${(props) => props.theme.euiTheme.colors.textParagraph};
    display: flex;
    flex-direction: row;
    flex-wrap: nowrap;
    justify-content: flex-start;
    overflow: hidden;

    ${(props) => useMonospaceTextStyle(props.scale, props.theme.euiTheme)};
    ${(props) => (props.isHighlighted ? highlightedContentStyle(props.theme.euiTheme) : '')}

    &:hover {
      ${(props) => hoveredContentStyle(props.theme.euiTheme)}
    }
  `,
  () => ({
    role: 'row',
  })
);

export interface LogEntryRowWrapperProps {
  scale: TextScale;
  isHighlighted?: boolean;
}

// eslint-disable-next-line import/no-default-export
export default LogEntryRowWrapper;
