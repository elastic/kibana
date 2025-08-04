/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiIcon,
  EuiPopover,
  EuiContextMenuItem,
  EuiContextMenuPanel,
} from '@elastic/eui';
import React, { useCallback, useState } from 'react';
import * as i18n from './translations';

interface Props {
  isDocumentAvailable?: boolean;
  isIndexAvailable?: boolean;
  onDocumentClicked?: () => void;
  onIndexClicked?: () => void;
}

export const AddEntryButton: React.FC<Props> = React.memo(
  ({
    isDocumentAvailable = true,
    isIndexAvailable = true,
    onDocumentClicked,
    onIndexClicked,
  }: Props) => {
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);

    const closePopover = useCallback(() => setIsPopoverOpen(false), []);
    const handleIndexClicked = useCallback(() => {
      closePopover();
      onIndexClicked?.();
    }, [closePopover, onIndexClicked]);

    const handleDocumentClicked = useCallback(() => {
      closePopover();
      onDocumentClicked?.();
    }, [closePopover, onDocumentClicked]);

    const onButtonClick = useCallback(() => setIsPopoverOpen((prevState) => !prevState), []);

    const items = [
      <EuiContextMenuItem
        aria-label={i18n.INDEX}
        key={i18n.INDEX}
        icon="index"
        onClick={handleIndexClicked}
        disabled={!isIndexAvailable}
      >
        {i18n.INDEX}
      </EuiContextMenuItem>,
      <EuiContextMenuItem
        aria-label={i18n.DOCUMENT}
        key={i18n.DOCUMENT}
        icon="document"
        data-test-subj="addDocument"
        onClick={handleDocumentClicked}
        disabled={!isDocumentAvailable}
      >
        {i18n.DOCUMENT}
      </EuiContextMenuItem>,
    ];
    return onIndexClicked || onDocumentClicked ? (
      <EuiPopover
        button={
          <EuiButton
            data-test-subj="addEntry"
            iconType="arrowDown"
            iconSide="right"
            onClick={onButtonClick}
          >
            <EuiIcon type="plusInCircle" />
            {i18n.NEW}
          </EuiButton>
        }
        isOpen={isPopoverOpen}
        closePopover={closePopover}
        anchorPosition="downLeft"
      >
        <EuiContextMenuPanel size="s" items={items} />
      </EuiPopover>
    ) : null;
  }
);

AddEntryButton.displayName = 'AddEntryButton';
