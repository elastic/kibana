/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { euiStyled } from '@kbn/kibana-react-plugin/common';
import { TextScale } from '../../../../common/log_text_scale';
import { highlightedContentStyle, hoveredContentStyle, monospaceTextStyle } from './text_styles';

export const LogEntryRowWrapper = euiStyled.div.attrs(() => ({
  role: 'row',
}))<LogEntryRowWrapperProps>`
    align-items: stretch;
    color: ${(props) => props.theme.eui.euiTextColor};
    display: flex;
    flex-direction: row;
    flex-wrap: nowrap;
    justify-content: flex-start;
    overflow: hidden;
  
    ${(props) => monospaceTextStyle(props.scale)};
    ${(props) => (props.isHighlighted ? highlightedContentStyle : '')}
  
    &:hover {
      ${hoveredContentStyle}
    }
  `;

export interface LogEntryRowWrapperProps {
  scale: TextScale;
  isHighlighted?: boolean;
}

// eslint-disable-next-line import/no-default-export
export default LogEntryRowWrapper;
