/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useState } from 'react';

import {
  EuiButtonEmpty,
  EuiModalFooter,
  EuiFlyout,
  EuiFlyoutHeader,
  EuiTitle,
  EuiFlyoutBody,
  EuiInMemoryTable,
  EuiFlexGroup,
  EuiButton,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { SavedView } from '../../hooks/use_saved_view';

interface Props<ViewState> {
  views: Array<SavedView<ViewState>>;
  loading: boolean;
  close(): void;
  setView(viewState: ViewState): void;
  deleteView(id: string): void;
}

interface DeleteConfimationProps {
  confirmedAction(): void;
}
const DeleteConfimation = (props: DeleteConfimationProps) => {
  const [confirmVisible, setConfirmVisible] = useState(false);

  const showConfirm = useCallback(() => setConfirmVisible(true), []);
  const hideConfirm = useCallback(() => setConfirmVisible(false), []);

  return (
    <>
      {confirmVisible && (
        <EuiFlexGroup>
          <EuiButton
            fill={true}
            iconType="trash"
            color="danger"
            onClick={props.confirmedAction}
            data-test-subj="showConfirm"
          >
            <FormattedMessage
              defaultMessage="Are you sure?"
              id="xpack.infra.openView.actionNames.deleteConfirmation"
            />
          </EuiButton>
          <EuiButtonEmpty onClick={hideConfirm} data-test-subj="hideConfirm">
            <FormattedMessage defaultMessage="cancel" id="xpack.infra.waffle.savedViews.cancel" />
          </EuiButtonEmpty>
        </EuiFlexGroup>
      )}
      {!confirmVisible && (
        <EuiButtonEmpty onClick={showConfirm}>
          <FormattedMessage
            defaultMessage="Delete view"
            id="xpack.infra.openView.actionNames.delete"
          />
        </EuiButtonEmpty>
      )}
    </>
  );
};

export function SavedViewListFlyout<ViewState>({
  close,
  views,
  setView,
  deleteView,
  loading,
}: Props<ViewState>) {
  const columns = [
    {
      field: 'name',
      name: i18n.translate('xpack.infra.openView.columnNames.name', { defaultMessage: 'Name' }),
      sortable: true,
      truncateText: true,
      render: (name: string, item: SavedView<ViewState>) => {
        return (
          <EuiButtonEmpty
            onClick={() => {
              setView(item);
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
          available: (item: SavedView<ViewState>) => !item.isDefault,
          render: (item: SavedView<ViewState>) => {
            return <DeleteConfimation confirmedAction={() => deleteView(item.id)} />;
          },
        },
      ],
    },
  ];

  return (
    <EuiFlyout onClose={close} data-test-subj="loadViewsFlyout">
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
        <EuiButtonEmpty data-test-subj="cancelSavedViewModal" onClick={close}>
          <FormattedMessage defaultMessage="Cancel" id="xpack.infra.openView.cancelButton" />
        </EuiButtonEmpty>
      </EuiModalFooter>
    </EuiFlyout>
  );
}
