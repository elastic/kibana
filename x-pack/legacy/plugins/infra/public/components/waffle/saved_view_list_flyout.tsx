/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useMemo } from 'react';

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
import { WaffleViewState } from '../../containers/waffle/with_waffle_view_state';
import { initialWaffleOptionsState } from '../../store/local/waffle_options';
import { initialWaffleTimeState } from '../../store/local/waffle_time';

interface View extends WaffleViewState {
  name: string;
  id: string;
  isDefault?: boolean;
}
interface Props {
  close(): void;
  views: View[];
  loading: boolean;
  loadView(vs: WaffleViewState): void;
  deleteView(id: string): void;
}

export const SavedViewListFlyout = ({ close, views, loadView, deleteView, loading }: Props) => {
  const removeView = useCallback(e => deleteView(e.id), []);

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
          available: (item: View) => !item.isDefault,
          icon: 'trash',
          color: 'danger',
          onClick: removeView,
        },
      ],
    },
  ];

  const viewsWithDefault = useMemo(() => {
    views.unshift({
      name: i18n.translate('xpack.infra.openView.defaultViewName', {
        defaultMessage: 'Default View',
      }),
      id: '0',
      isDefault: true,
      filterQuery: null,
      ...initialWaffleOptionsState,
      ...initialWaffleTimeState,
    });
    return views;
  }, [views]);

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
          items={viewsWithDefault}
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
