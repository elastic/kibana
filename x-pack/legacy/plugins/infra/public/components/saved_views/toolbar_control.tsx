/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButtonEmpty, EuiFlexGroup } from '@elastic/eui';
import React, { useCallback, useState, useEffect } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { SavedViewListFlyout } from './view_list_flyout';
import { SavedViewCreateModal } from './create_modal';
import { useSavedView } from '../../hooks/use_saved_view';
interface Props<ViewState> {
  viewType: string;
  viewState: ViewState;
  defaultViewState: ViewState;
  onViewChange(viewState: ViewState): void;
}

export function SavedViewsToolbarControls<ViewState>(props: Props<ViewState>) {
  const { views, saveView, loading, deletedId, deleteView, find } = useSavedView(
    props.defaultViewState,
    props.viewType
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
        <EuiButtonEmpty onClick={openSaveModal} data-test-subj="openSaveViewModal">
          <FormattedMessage
            defaultMessage="Save view"
            id="xpack.infra.waffle.savedViews.saveViewLabel"
          />
        </EuiButtonEmpty>
        <EuiButtonEmpty onClick={loadViews} data-test-subj="loadViews">
          <FormattedMessage
            defaultMessage="Load views"
            id="xpack.infra.waffle.savedViews.loadViewsLabel"
          />
        </EuiButtonEmpty>
      </EuiFlexGroup>

      {createModalOpen && <SavedViewCreateModal close={closeCreateModal} save={save} />}
      {modalOpen && (
        <SavedViewListFlyout<ViewState>
          loading={loading}
          views={views}
          deleteView={deleteView}
          close={closeModal}
          setView={props.onViewChange}
        />
      )}
    </>
  );
}
