/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback } from 'react';

import {
  EuiButtonEmpty,
  EuiModalFooter,
  EuiFlyout,
  EuiFlyoutHeader,
  EuiTitle,
  EuiFlyoutBody,
  EuiInMemoryTable,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { WaffleViewState, SavedView } from '../../containers/waffle/with_waffle_view_state';

interface Props {
  views: SavedView[];
  loading: boolean;
  close(): void;
  loadView(vs: WaffleViewState): void;
  deleteView(id: string): void;
}

export const SavedViewListFlyout = ({ close, views, loadView, deleteView, loading }: Props) => {
  const columns = [
    {
      field: 'name',
      name: i18n.translate('xpack.infra.openView.columnNames.name', { defaultMessage: 'Name' }),
      sortable: true,
      truncateText: true,
      render: (name: string, item: WaffleViewState) => {
        return (
          <EuiButtonEmpty
            onClick={() => {
              loadView(item);
              close();
            }}
          >
            {name}
          </EuiButtonEmpty>
        );
      },
    },
    {
      name: i18n.translate('xpack.infra.openView.columnNames.actions', {
        defaultMessage: 'Actions',
      }),
      actions: [
        {
          name: i18n.translate('xpack.infra.openView.actionNames.delete', {
            defaultMessage: 'Delete',
          }),
          description: i18n.translate('xpack.infra.openView.actionDescription.delete', {
            defaultMessage: 'Delete a view',
          }),
          icon: 'trash',
          color: 'danger',
          available: (item: SavedView) => !item.isDefault,
          onClick: useCallback(e => deleteView(e.id), []),
        },
      ],
    },
  ];

  return (
    <EuiFlyout onClose={close}>
      <EuiFlyoutHeader>
        <EuiTitle size="m">
          <h2>
            <FormattedMessage defaultMessage="Load views" id="xpack.infra.openView.flyoutHeader" />
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        <EuiInMemoryTable
          items={views}
          columns={columns}
          loading={loading}
          search={true}
          pagination={true}
          sorting={true}
        />
      </EuiFlyoutBody>

      <EuiModalFooter>
        <EuiButtonEmpty onClick={close}>
          <FormattedMessage defaultMessage="Cancel" id="xpack.infra.openView.cancelButton" />
        </EuiButtonEmpty>
      </EuiModalFooter>
    </EuiFlyout>
  );
};
