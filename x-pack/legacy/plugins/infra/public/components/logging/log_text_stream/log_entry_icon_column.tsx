/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButtonIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

import { LogEntryColumnContent } from './log_entry_column';
import { hoveredContentStyle } from './text_styles';
import euiStyled from '../../../../../../common/eui_styled_components';

interface LogEntryIconColumnProps {
  isHighlighted: boolean;
  isHovered: boolean;
}

export const LogEntryIconColumn: React.FunctionComponent<LogEntryIconColumnProps> = ({
  children,
  isHighlighted,
  isHovered,
}) => {
  return (
    <IconColumnContent isHighlighted={isHighlighted} isHovered={isHovered}>
      {children}
    </IconColumnContent>
  );
};

export const LogEntryDetailsIconColumn: React.FunctionComponent<LogEntryIconColumnProps & {
  openFlyout: () => void;
}> = ({ isHighlighted, isHovered, openFlyout }) => {
  const label = i18n.translate('xpack.infra.logEntryItemView.viewDetailsToolTip', {
    defaultMessage: 'View Details',
  });

  return (
    <LogEntryIconColumn isHighlighted={isHighlighted} isHovered={isHovered}>
      {isHovered ? (
        <AbsoluteIconButtonWrapper>
          <EuiButtonIcon onClick={openFlyout} iconType="expand" title={label} aria-label={label} />
        </AbsoluteIconButtonWrapper>
      ) : null}
    </LogEntryIconColumn>
  );
};

interface IconColumnContentProps {
  isHighlighted: boolean;
  isHovered: boolean;
}

const IconColumnContent = euiStyled(LogEntryColumnContent)<IconColumnContentProps>`
  background-color: ${props => props.theme.eui.euiColorEmptyShade};
  overflow: hidden;
  user-select: none;

  ${props => (props.isHovered || props.isHighlighted ? hoveredContentStyle : '')};
`;

// this prevents the button from influencing the line height
const AbsoluteIconButtonWrapper = euiStyled.div`
  overflow: hidden;
  position: absolute;
`;
