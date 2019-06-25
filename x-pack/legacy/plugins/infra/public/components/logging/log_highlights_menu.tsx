/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useCallback, useState } from 'react';
import { EuiPopover, EuiButton } from '@elastic/eui';
import euiStyled from '../../../../../common/eui_styled_components';

export const LogHighlightsMenu: React.FC = () => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const togglePopover = useCallback(
    () => {
      setIsPopoverOpen(!isPopoverOpen);
    },
    [isPopoverOpen, setIsPopoverOpen]
  );
  const closePopover = useCallback(
    () => {
      setIsPopoverOpen(false);
    },
    [setIsPopoverOpen]
  );

  const button = (
    <EuiButton iconType="arrowDown" iconSide="right" onClick={togglePopover}>
      Highlights
    </EuiButton>
  );

  return (
    <EuiPopover id="popover" button={button} isOpen={isPopoverOpen} closePopover={closePopover}>
      <div>Highlights menu content</div>
    </EuiPopover>
  );
};
