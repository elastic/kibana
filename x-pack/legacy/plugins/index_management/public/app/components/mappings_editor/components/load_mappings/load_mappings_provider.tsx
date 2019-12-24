/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useRef } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiConfirmModal, EuiOverlayMask } from '@elastic/eui';

import { JsonEditor, OnUpdateHandler } from '../../../json_editor';
import { validateMappings, MappingsValidatorResponse } from '../../lib';

type OpenJsonModalFunc = () => void;

interface Props {
  onJson(json: { [key: string]: any }): void;
  children: (deleteProperty: OpenJsonModalFunc) => React.ReactNode;
}

interface State {
  isModalOpen: boolean;
  json?: {
    unparsed: { [key: string]: any };
    parsed: { [key: string]: any };
  };
  error?: MappingsValidatorResponse['error'];
}

type ModalView = 'json' | 'validationResult';

const getTexts = (view: ModalView) => ({
  modalTitle: i18n.translate('xpack.idxMgmt.mappingsEditor.loadMappingsModal.title', {
    defaultMessage: 'Load mappings from JSON',
  }),
  buttons: {
    confirm:
      view === 'json'
        ? i18n.translate('xpack.idxMgmt.mappingsEditor.loadMappingsModal.loadButtonLabel', {
            defaultMessage: 'Load',
          })
        : i18n.translate('xpack.idxMgmt.mappingsEditor.loadMappingsModal.acceptWarningLabel', {
            defaultMessage: 'OK',
          }),
    cancel:
      view === 'json'
        ? i18n.translate('xpack.idxMgmt.mappingsEditor.loadMappingsModal.cancelButtonLabel', {
            defaultMessage: 'Cancel',
          })
        : i18n.translate('xpack.idxMgmt.mappingsEditor.loadMappingsModal.goBackButtonLabel', {
            defaultMessage: 'Go back',
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
});

export const LoadMappingsProvider = ({ onJson, children }: Props) => {
  const [state, setState] = useState<State>({ isModalOpen: false });
  const jsonContent = useRef<Parameters<OnUpdateHandler>['0'] | undefined>();
  const view: ModalView =
    state.json !== undefined && state.error !== undefined ? 'validationResult' : 'json';
  const i18nTexts = getTexts(view);

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
    const isValidJson = jsonContent.current!.validate();

    if (isValidJson) {
      // Parse and validate the JSON to make sure it won't break the UI
      const unparsed = jsonContent.current!.data.format();
      const { value: parsed, error } = validateMappings(unparsed);

      if (error) {
        setState({ isModalOpen: true, json: { unparsed, parsed }, error });
        return;
      }

      onJson(parsed);
      closeModal();
    }
  };

  const onConfirm = () => {
    if (view === 'json') {
      loadJson();
    } else {
      // We have some JSON and we agree on the error
      onJson(state.json!.parsed);
      closeModal();
    }
  };

  const onCancel = () => {
    if (view === 'json') {
      // Cancel...
      closeModal();
    } else {
      // Go back to the JSON editor to correct the errors.
      setState({ isModalOpen: true, json: state.json });
    }
  };

  return (
    <>
      {children(openModal)}

      {state.isModalOpen && (
        <EuiOverlayMask>
          <EuiConfirmModal
            title={i18nTexts.modalTitle}
            onCancel={onCancel}
            onConfirm={onConfirm}
            cancelButtonText={i18nTexts.buttons.cancel}
            buttonColor="danger"
            confirmButtonText={i18nTexts.buttons.confirm}
          >
            {view === 'json' ? (
              // The CSS override for the EuiCodeEditor requires a parent .application css class
              <div className="application">
                <JsonEditor
                  label={i18nTexts.editor.label}
                  helpText={i18nTexts.editor.helpText}
                  onUpdate={onJsonUpdate}
                  defaultValue={state.json?.unparsed}
                  euiCodeEditorProps={{
                    height: '450px',
                  }}
                />
              </div>
            ) : (
              <div>Errors in the JSON</div>
            )}
          </EuiConfirmModal>
        </EuiOverlayMask>
      )}
    </>
  );
};
