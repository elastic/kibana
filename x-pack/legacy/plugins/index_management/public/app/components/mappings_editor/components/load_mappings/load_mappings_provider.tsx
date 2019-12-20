/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useRef } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiConfirmModal, EuiOverlayMask } from '@elastic/eui';

import { JsonEditor, OnUpdateHandler } from '../../../json_editor';

type OpenJsonModalFunc = () => void;

interface Props {
  onJson(json: { [key: string]: any }): void;
  children: (deleteProperty: OpenJsonModalFunc) => React.ReactNode;
}

interface State {
  isModalOpen: boolean;
}

const i18nTexts = {
  modalTitle: i18n.translate('xpack.idxMgmt.mappingsEditor.loadMappingsModal.title', {
    defaultMessage: 'Load mappings from JSON',
  }),
  buttons: {
    confirm: i18n.translate('xpack.idxMgmt.mappingsEditor.loadMappingsModal.loadButtonLabel', {
      defaultMessage: 'Load',
    }),
    cancel: i18n.translate('xpack.idxMgmt.mappingsEditor.loadMappingsModal.cancelButtonLabel', {
      defaultMessage: 'Cancel',
    }),
  },
  editor: {
    label: i18n.translate('xpack.idxMgmt.mappingsEditor.loadMappingsModal.jsonEditorLabel', {
      defaultMessage: 'JSON mappings to load',
    }),
    helpText: i18n.translate('xpack.idxMgmt.mappingsEditor.loadMappingsModal.jsonEditorHelpText', {
      defaultMessage:
        "All unknown parameters or parameters whose values don't have the correct format will be removed.",
    }),
  },
};

export const LoadMappingsProvider = ({ onJson, children }: Props) => {
  const [state, setState] = useState<State>({ isModalOpen: false });
  const jsonContent = useRef<Parameters<OnUpdateHandler>['0'] | undefined>();

  const onJsonUpdate: OnUpdateHandler = jsonUpdateData => {
    jsonContent.current = jsonUpdateData;
  };

  const openModal: OpenJsonModalFunc = () => {
    setState({ isModalOpen: true });
  };

  const closeModal = () => {
    setState({ isModalOpen: false });
  };

  const loadJson = () => {
    const isValid = jsonContent.current!.validate();

    if (isValid) {
      onJson(jsonContent.current!.data.format());
      closeModal();
    }
  };

  return (
    <>
      {children(openModal)}

      {state.isModalOpen && (
        <EuiOverlayMask>
          <EuiConfirmModal
            title={i18nTexts.modalTitle}
            onCancel={closeModal}
            onConfirm={loadJson}
            cancelButtonText={i18nTexts.buttons.cancel}
            buttonColor="danger"
            confirmButtonText={i18nTexts.buttons.confirm}
          >
            {/* The override for the EuiCodeEditor is around the .application css class */}
            <div className="application">
              <JsonEditor
                label={i18nTexts.editor.label}
                helpText={i18nTexts.editor.helpText}
                onUpdate={onJsonUpdate}
                euiCodeEditorProps={{
                  height: '450px',
                }}
              />
            </div>
          </EuiConfirmModal>
        </EuiOverlayMask>
      )}
    </>
  );
};
