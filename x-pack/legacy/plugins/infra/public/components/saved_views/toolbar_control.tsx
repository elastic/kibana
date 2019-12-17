/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButtonEmpty, EuiFlexGroup } from '@elastic/eui';
import React, { useCallback, useState, useEffect } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { useSavedView } from '../../hooks/use_saved_view';
import { SavedViewCreateModal } from './create_modal';
import { SavedViewListFlyout } from './view_list_flyout';
import { useKibana } from '../../../../../../../src/plugins/kibana_react/public';

interface Props<ViewState> {
  viewType: string;
  viewState: ViewState;
  defaultViewState: ViewState;
  onViewChange(viewState: ViewState): void;
}

export function SavedViewsToolbarControls<ViewState>(props: Props<ViewState>) {
  const kibana = useKibana();
  const {
    views,
    saveView,
    loading,
    deletedId,
    deleteView,
    find,
    errorOnFind,
    errorOnCreate,
    createdId,
  } = useSavedView(props.defaultViewState, props.viewType);
  const [modalOpen, setModalOpen] = useState(false);
  const [isInvalid, setIsInvalid] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const openSaveModal = useCallback(() => {
    setIsInvalid(false);
    setCreateModalOpen(true);
  }, []);
  const closeModal = useCallback(() => setModalOpen(false), []);
  const closeCreateModal = useCallback(() => setCreateModalOpen(false), []);
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
    if (errorOnCreate) {
      setIsInvalid(true);
    }
  }, [errorOnCreate]);

  useEffect(() => {
    if (createdId !== undefined) {
      // INFO: Close the modal after the view is created.
      closeCreateModal();
    }
  }, [createdId, closeCreateModal]);

  useEffect(() => {
    if (deletedId !== undefined) {
      // INFO: Refresh view list after an item is deleted
      find();
    }
  }, [deletedId, find]);

  useEffect(() => {
    if (errorOnCreate) {
      kibana.notifications.toasts.warning(getErrorToast('create', errorOnCreate)!);
    } else if (errorOnFind) {
      kibana.notifications.toasts.warning(getErrorToast('find', errorOnFind)!);
    }
  }, [errorOnCreate, errorOnFind, kibana]);

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

      {createModalOpen && (
        <SavedViewCreateModal isInvalid={isInvalid} close={closeCreateModal} save={save} />
      )}
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

const getErrorToast = (type: 'create' | 'find', msg?: string) => {
  if (type === 'create') {
    return {
      title:
        msg ||
        i18n.translate('xpack.infra.savedView.errorOnCreate.title', {
          defaultMessage: `An error occured saving view.`,
        }),
    };
  } else if (type === 'find') {
    return {
      title:
        msg ||
        i18n.translate('xpack.infra.savedView.findError.title', {
          defaultMessage: `An error occurred while loading views.`,
        }),
    };
  }
};
