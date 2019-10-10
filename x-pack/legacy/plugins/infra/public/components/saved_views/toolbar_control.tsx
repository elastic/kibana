/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButtonEmpty, EuiFlexGroup } from '@elastic/eui';
import React, { useCallback, useState, useEffect } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { toastNotifications } from 'ui/notify';
import { i18n } from '@kbn/i18n';
import { useSavedView } from '../../hooks/use_saved_view';
import { SavedViewCreateModal } from './create_modal';
import { SavedViewListFlyout } from './view_list_flyout';
interface Props<ViewState> {
  viewType: string;
  viewState: ViewState;
  defaultViewState: ViewState;
  onViewChange(viewState: ViewState): void;
}

export function SavedViewsToolbarControls<ViewState>(props: Props<ViewState>) {
  const {
    views,
    saveView,
    loading,
    deletedId,
    deleteView,
    find,
    errorOnFind,
    errorOnCreate,
  } = useSavedView(props.defaultViewState, props.viewType);
  const [modalOpen, setModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const openSaveModal = useCallback(() => setCreateModalOpen(true), []);
  const closeCreateModal = useCallback(() => setCreateModalOpen(false), []);
  const closeModal = useCallback(() => setModalOpen(false), []);
  const loadViews = useCallback(() => {
    find();
    setModalOpen(true);
  }, [find]);
  const save = useCallback(
    (name: string, hasTime: boolean = false) => {
      const currentState = {
        ...props.viewState,
        ...(!hasTime ? { time: undefined } : {}),
      };
      saveView({ name, ...currentState });
    },
    [props.viewState, saveView]
  );

  useEffect(() => {
    if (deletedId !== undefined) {
      // INFO: Refresh view list after an item is deleted
      find();
    }
  }, [deletedId, find]);

  useEffect(() => {
    if (errorOnCreate) {
      toastNotifications.addWarning(getErrorToast('create')!);
    } else if (errorOnFind) {
      toastNotifications.addWarning(getErrorToast('find')!);
    }
  }, [errorOnCreate, errorOnFind]);

  return (
    <>
      <EuiFlexGroup>
        <EuiButtonEmpty iconType="save" onClick={openSaveModal} data-test-subj="openSaveViewModal">
          <FormattedMessage
            defaultMessage="Save"
            id="xpack.infra.waffle.savedViews.saveViewLabel"
          />
        </EuiButtonEmpty>
        <EuiButtonEmpty iconType="importAction" onClick={loadViews} data-test-subj="loadViews">
          <FormattedMessage
            defaultMessage="Load"
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

const getErrorToast = (type: 'create' | 'find') => {
  if (type === 'create') {
    return {
      title: i18n.translate('xpack.infra.savedView.errorOnCreate.title', {
        defaultMessage: `An error occured saving view.`,
      }),
    };
  } else if (type === 'find') {
    return {
      title: i18n.translate('xpack.infra.savedView.findError.title', {
        defaultMessage: `An error occurred while loading views.`,
      }),
    };
  }
};
