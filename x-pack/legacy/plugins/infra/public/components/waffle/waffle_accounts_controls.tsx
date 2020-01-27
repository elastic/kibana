/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiContextMenuPanelDescriptor,
  EuiFilterButton,
  EuiFilterGroup,
  EuiPopover,
  EuiContextMenu,
} from '@elastic/eui';
import React, { useCallback, useState, useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { InventoryCloudAccount } from '../../../common/http_api/inventory_meta_api';

interface Props {
  accountId: string;
  options: InventoryCloudAccount[];
  changeAccount: (id: string) => void;
}

export const WaffleAccountsControls = (props: Props) => {
  const { accountId, options } = props;
  const [isOpen, setIsOpen] = useState();

  const showPopover = useCallback(() => {
    setIsOpen(true);
  }, [setIsOpen]);

  const closePopover = useCallback(() => {
    setIsOpen(false);
  }, [setIsOpen]);

  const currentLabel = options.find(o => o.value === accountId);

  const changeAccount = useCallback(
    (val: string) => {
      if (accountId === val) {
        props.changeAccount('');
      } else {
        props.changeAccount(val);
      }
      closePopover();
    },
    [accountId, closePopover, props]
  );

  const panels = useMemo<EuiContextMenuPanelDescriptor[]>(
    () => [
      {
        id: 0,
        title: '',
        items: options.map(o => {
          const icon = o.value === accountId ? 'check' : 'empty';
          const panel = { name: o.name, onClick: () => changeAccount(o.value), icon };
          return panel;
        }),
      },
    ],
    [options, accountId, changeAccount]
  );

  return (
    <EuiFilterGroup>
      <EuiPopover
        isOpen={isOpen}
        id="accontPopOver"
        button={
          <EuiFilterButton iconType="arrowDown" onClick={showPopover}>
            <FormattedMessage
              id="xpack.infra.waffle.accountLabel"
              defaultMessage="Account: {selectedAccount}"
              values={{
                selectedAccount: currentLabel
                  ? currentLabel.name
                  : i18n.translate('xpack.infra.waffle.accountAllTitle', {
                      defaultMessage: 'All',
                    }),
              }}
            />
          </EuiFilterButton>
        }
        anchorPosition="downLeft"
        panelPaddingSize="none"
        closePopover={closePopover}
      >
        <EuiContextMenu initialPanelId={0} panels={panels} />
      </EuiPopover>
    </EuiFilterGroup>
  );
};
