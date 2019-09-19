/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButtonEmpty, EuiFlexGroup } from '@elastic/eui';
import React, { useCallback, useState, useEffect } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { SavedViewListFlyout } from './saved_view_list_flyout';
import { SavedViewCreateModal } from './saved_view_create_modal';
import { WaffleViewState } from '../../containers/waffle/with_waffle_view_state';
import { useSavedView } from '../../hooks/use_saved_view';
interface Props {
  viewState: WaffleViewState;
  defaultViewState: WaffleViewState;
  onViewChange(viewState: WaffleViewState): void;
}

export const SavedViewsToolbarControls = (props: Props) => {
  const { views, saveView, loading, deletedId, deleteView, find } = useSavedView(
    props.defaultViewState,
    'INVENTORY_VIEW'
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const openSaveModal = useCallback(() => setCreateModalOpen(true), []);
  const closeCreateModal = useCallback(() => setCreateModalOpen(false), []);
  const closeModal = useCallback(() => setModalOpen(false), []);
  const loadViews = useCallback(() => {
    find();
    setModalOpen(true);
  }, []);
  const save = useCallback(
    (name: string, hasTime: boolean = false) => {
      const currentState = {
        ...props.viewState,
        ...(!hasTime ? { time: undefined } : {}),
      };
      saveView({ name, ...currentState });
    },
    [props.viewState]
  );

  useEffect(() => {
    if (deletedId !== undefined) {
      // INFO: Refresh view list after an item is deleted
      find();
    }
  }, [deletedId]);

  return (
    <>
      <EuiFlexGroup>
        <EuiButtonEmpty onClick={openSaveModal}>
          <FormattedMessage
            defaultMessage="Save view"
            id="xpack.infra.waffle.savedViews.saveViewLabel"
          />
        </EuiButtonEmpty>
        <EuiButtonEmpty onClick={loadViews}>
          <FormattedMessage
            defaultMessage="Load views"
            id="xpack.infra.waffle.savedViews.loadViewsLabel"
          />
        </EuiButtonEmpty>
      </EuiFlexGroup>

      {createModalOpen && <SavedViewCreateModal close={closeCreateModal} save={save} />}
      {modalOpen && (
        <SavedViewListFlyout
          loading={loading}
          views={views}
          deleteView={deleteView}
          close={closeModal}
          loadView={props.onViewChange}
        />
      )}
    </>
  );
};
