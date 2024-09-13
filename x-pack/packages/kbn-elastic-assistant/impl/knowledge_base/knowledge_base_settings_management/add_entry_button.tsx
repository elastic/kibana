/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPopover,
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
    return onIndexClicked || onDocumentClicked ? (
      <EuiPopover
        button={
          <EuiButton iconType="arrowDown" iconSide="right" onClick={onButtonClick}>
            <EuiIcon type="plusInCircle" />
            {i18n.NEW}
          </EuiButton>
        }
        isOpen={isPopoverOpen}
        closePopover={closePopover}
        anchorPosition="downLeft"
      >
        <EuiFlexGroup direction="column" gutterSize="none" alignItems="flexStart">
          {onIndexClicked != null && (
            <EuiFlexItem>
              <EuiButtonEmpty
                aria-label={i18n.INDEX}
                iconType="index"
                onClick={handleIndexClicked}
                disabled={!isIndexAvailable}
                color="text"
              >
                {i18n.INDEX}
              </EuiButtonEmpty>
            </EuiFlexItem>
          )}
          {onDocumentClicked != null && (
            <EuiFlexItem>
              <EuiButtonEmpty
                aria-label={i18n.DOCUMENT}
                iconType="document"
                onClick={handleDocumentClicked}
                disabled={!isDocumentAvailable}
                color="text"
              >
                {i18n.DOCUMENT}
              </EuiButtonEmpty>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiPopover>
    ) : null;
  }
);

AddEntryButton.displayName = 'AddEntryButton';
