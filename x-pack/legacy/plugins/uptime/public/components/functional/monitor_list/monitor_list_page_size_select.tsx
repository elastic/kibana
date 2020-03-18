/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButtonEmpty, EuiContextMenuPanel, EuiContextMenuItem, EuiPopover } from '@elastic/eui';
import React, { useState, useEffect } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { useUrlParams } from '../../../hooks';

interface PopoverButtonProps {
  setIsOpen: (isOpen: boolean) => any;
  size: number;
}

const PopoverButton: React.FC<PopoverButtonProps> = ({ setIsOpen, size }) => (
  <EuiButtonEmpty
    color="text"
    iconType="arrowDown"
    iconSide="right"
    onClick={() => setIsOpen(true)}
  >
    <FormattedMessage
      id="xpack.uptime.monitorList.pageSizePopoverButtonText"
      defaultMessage="Rows per page: {size}"
      values={{ size }}
    />
  </EuiButtonEmpty>
);

interface ContextItemProps {
  key: string;
  numRows: number;
}

const items: ContextItemProps[] = [
  {
    key: '10 rows',
    numRows: 10,
  },
  {
    key: '25 rows',
    numRows: 25,
  },
  {
    key: '50 rows',
    numRows: 50,
  },
  {
    key: '100 rows',
    numRows: 100,
  },
];

const LOCAL_STORAGE_KEY = 'xpack.uptime.monitorList.pageSize';

interface MonitorListPageSizeSelectProps {
  size: number;
  setSize: (value: number) => void;
}

export const MonitorListPageSizeSelect = ({ size, setSize }: MonitorListPageSizeSelectProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const [getUrlParams, setUrlParams] = useUrlParams();
  const params = getUrlParams();

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, size.toString());
  }, [size]);

  return (
    <EuiPopover
      button={<PopoverButton setIsOpen={value => setIsOpen(value)} size={size} />}
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      anchorPosition="upLeft"
    >
      <EuiContextMenuPanel
        items={items.map(({ key, numRows }) => (
          <EuiContextMenuItem
            key={key}
            icon={size === numRows ? 'check' : 'empty'}
            onClick={() => {
              setSize(numRows);
              if (params.pagination) {
                delete params.pagination;
              }
              // reset pagination because the page size has changed
              setUrlParams({ pagination: undefined });
              setIsOpen(false);
            }}
          >
            <FormattedMessage
              id="xpack.uptime.monitorList.pageSizeSelect.numRowsItemMessage"
              defaultMessage="{numRows} rows"
              values={{ numRows }}
            />
          </EuiContextMenuItem>
        ))}
      />
    </EuiPopover>
  );
};
