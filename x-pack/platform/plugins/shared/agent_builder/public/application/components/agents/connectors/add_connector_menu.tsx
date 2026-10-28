/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButton,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiPopover,
  type EuiButtonProps,
} from '@elastic/eui';
import { labels } from '../../../utils/i18n';

export interface AddConnectorMenuProps {
  onAddFromLibrary: () => void;
  onCreateNew: () => void;
  buttonLabel?: string;
  buttonTestSubj?: string;
  fill?: boolean;
  size?: EuiButtonProps['size'];
}

export const AddConnectorMenu: React.FC<AddConnectorMenuProps> = ({
  onAddFromLibrary,
  onCreateNew,
  buttonLabel = labels.connectors.addConnectorButton,
  buttonTestSubj = 'agentBuilderAddConnectorButton',
  fill = true,
  size,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <EuiPopover
      aria-label={labels.connectors.addConnectorPopoverLabel}
      button={
        <EuiButton
          fill={fill}
          size={size}
          iconType="plusCircle"
          iconSide="left"
          onClick={() => setIsOpen((prev) => !prev)}
          data-test-subj={buttonTestSubj}
        >
          {buttonLabel}
        </EuiButton>
      }
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      anchorPosition="downLeft"
      panelPaddingSize="none"
    >
      <EuiContextMenuPanel
        items={[
          <EuiContextMenuItem
            key="from-library"
            icon="download"
            data-test-subj="agentConnectorsAddFromLibraryMenuItem"
            onClick={() => {
              setIsOpen(false);
              onAddFromLibrary();
            }}
          >
            {labels.connectors.fromLibraryMenuItem}
          </EuiContextMenuItem>,
          <EuiContextMenuItem
            key="create-new"
            icon="plusCircle"
            data-test-subj="agentConnectorsCreateNewMenuItem"
            onClick={() => {
              setIsOpen(false);
              onCreateNew();
            }}
          >
            {labels.connectors.createNewMenuItem}
          </EuiContextMenuItem>,
        ]}
      />
    </EuiPopover>
  );
};
