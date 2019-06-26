/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useCallback, useState } from 'react';
import { EuiPopover, EuiButtonEmpty, EuiFieldText } from '@elastic/eui';

interface LogHighlightsMenuProps {
  onChange: (highlightTerms: string[]) => void;
}
export const LogHighlightsMenu: React.FC<LogHighlightsMenuProps> = ({ onChange }) => {
  // Popover state
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
  // Input field state
  const [highlightTerm, setHighlightTerm] = useState('');
  const changeHighlightTerm = useCallback(
    e => {
      const value = e.target.value;
      setHighlightTerm(value);
      onChange([value]);
    },
    [setHighlightTerm, onChange]
  );
  const button = (
    <EuiButtonEmpty
      color="text"
      size="xs"
      iconType="arrowDown"
      iconSide="right"
      onClick={togglePopover}
    >
      Highlights
    </EuiButtonEmpty>
  );

  return (
    <EuiPopover id="popover" button={button} isOpen={isPopoverOpen} closePopover={closePopover}>
      <div>
        <EuiFieldText
          placeholder="Term to highlight"
          value={highlightTerm}
          onChange={changeHighlightTerm}
          aria-label="Term to highlight"
        />
      </div>
    </EuiPopover>
  );
};
