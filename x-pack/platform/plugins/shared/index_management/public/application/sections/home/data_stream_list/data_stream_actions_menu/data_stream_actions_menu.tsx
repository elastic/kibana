/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiContextMenu, EuiPopover } from '@elastic/eui';
import React, { useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiContextMenuPanelItemDescriptor } from '@elastic/eui/src/components/context_menu/context_menu';
import { i18n } from '@kbn/i18n';

interface Props {
  dataStreamActions: EuiContextMenuPanelItemDescriptor[];
  selectedDataStreamsCount: number;
}

export const DataStreamActionsMenu = ({ dataStreamActions, selectedDataStreamsCount }: Props) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const popoverButton = (
    <EuiButton
      data-test-subj="dataStreamActionsPopoverButton"
      onClick={() => setIsPopoverOpen(!isPopoverOpen)}
      iconType="arrowDown"
      iconSide="right"
      fill={true}
    >
      <FormattedMessage
        id="xpack.idxMgmt.dataStreamList.table.manageDataStreamsButtonLabel"
        defaultMessage="Manage {selectedDataStreamsCount, plural, one {data stream} other {{selectedDataStreamsCount} data streams}}"
        values={{ selectedDataStreamsCount }}
      />
    </EuiButton>
  );

  return (
    <EuiPopover
      id="dataStreamActionsPopover"
      button={popoverButton}
      isOpen={isPopoverOpen}
      closePopover={() => setIsPopoverOpen(false)}
      panelPaddingSize="none"
      anchorPosition="rightUp"
      repositionOnScroll={true}
    >
      <EuiContextMenu
        data-test-subj="dataStreamActionsContextMenu"
        initialPanelId={0}
        panels={[
          {
            id: 0,
            title: i18n.translate(
              'xpack.idxMgmt.dataStreamList.table.dataStreamsContextMenuPanelLabel',
              {
                defaultMessage: 'Data stream options',
              }
            ),
            items: dataStreamActions,
          },
        ]}
      />
    </EuiPopover>
  );
};
