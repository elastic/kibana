/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useRef } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiConfirmModal,
  EuiOverlayMask,
  EuiCallOut,
  EuiText,
  EuiSpacer,
  EuiButtonEmpty,
} from '@elastic/eui';

import { JsonEditor, OnJsonEditorUpdateHandler } from '../../shared_imports';
import { validateMappings, MappingsValidationError } from '../../lib';

const MAX_ERRORS_TO_DISPLAY = 10;

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
  errors?: MappingsValidationError[];
}

type ModalView = 'json' | 'validationResult';

const getTexts = (view: ModalView, totalErrors = 0) => ({
  modalTitle: i18n.translate('xpack.idxMgmt.mappingsEditor.loadJsonModal.title', {
    defaultMessage: 'Load mappings from JSON',
  }),
  buttons: {
    confirm:
      view === 'json'
        ? i18n.translate('xpack.idxMgmt.mappingsEditor.loadJsonModal.loadButtonLabel', {
            defaultMessage: 'Load',
          })
        : i18n.translate('xpack.idxMgmt.mappingsEditor.loadJsonModal.acceptWarningLabel', {
            defaultMessage: 'OK',
          }),
    cancel:
      view === 'json'
        ? i18n.translate('xpack.idxMgmt.mappingsEditor.loadJsonModal.cancelButtonLabel', {
            defaultMessage: 'Cancel',
          })
        : i18n.translate('xpack.idxMgmt.mappingsEditor.loadJsonModal.goBackButtonLabel', {
            defaultMessage: 'Go back',
          }),
  },
  editor: {
    label: i18n.translate('xpack.idxMgmt.mappingsEditor.loadJsonModal.jsonEditorLabel', {
      defaultMessage: 'Mappings object',
    }),
    helpText: i18n.translate('xpack.idxMgmt.mappingsEditor.loadJsonModal.jsonEditorHelpText', {
      defaultMessage:
        'Provide the complete mappings object with both the configuration and the properties.',
    }),
  },
  validationErrors: {
    title: i18n.translate('xpack.idxMgmt.mappingsEditor.loadJsonModal.validationErrorTitle', {
      defaultMessage:
        '{totalErrors} {totalErrors, plural, one {error} other {errors}} detected in the mappings object',
      values: {
        totalErrors,
      },
    }),
    description: i18n.translate(
      'xpack.idxMgmt.mappingsEditor.loadJsonModal.validationErrorDescription',
      {
        defaultMessage:
          'The mappings provided contains some errors. You can safely ignore them: the configuration, field or parameter containing an error will be discarded before loading the JSON object in the editor.',
      }
    ),
  },
});

const getErrorMessage = (error: MappingsValidationError) => {
  switch (error.code) {
    case 'ERR_CONFIG': {
      return (
        <FormattedMessage
          id="xpack.idxMgmt.mappingsEditor.loadJsonModal.validationError.configuration"
          defaultMessage="The {configName} configuration is invalid."
          values={{
            configName: <code>{error.configName}</code>,
          }}
        />
      );
    }
    case 'ERR_FIELD': {
      return (
        <FormattedMessage
          id="xpack.idxMgmt.mappingsEditor.loadJsonModal.validationError.field"
          defaultMessage="The {fieldPath} field is invalid."
          values={{
            fieldPath: <code>{error.fieldPath}</code>,
          }}
        />
      );
    }
    case 'ERR_PARAMETER': {
      return (
        <FormattedMessage
          id="xpack.idxMgmt.mappingsEditor.loadJsonModal.validationError.parameter"
          defaultMessage="The {paramName} parameter on field {fieldPath} is invalid."
          values={{
            paramName: <code>{error.paramName}</code>,
            fieldPath: <code>{error.fieldPath}</code>,
          }}
        />
      );
    }
  }
};

export const LoadMappingsProvider = ({ onJson, children }: Props) => {
  const [state, setState] = useState<State>({ isModalOpen: false });
  const [totalErrorsToDisplay, setTotalErrorsToDisplay] = useState<number>(MAX_ERRORS_TO_DISPLAY);
  const jsonContent = useRef<Parameters<OnJsonEditorUpdateHandler>['0'] | undefined>();
  const view: ModalView =
    state.json !== undefined && state.errors !== undefined ? 'validationResult' : 'json';
  const i18nTexts = getTexts(view, state.errors?.length);

  const onJsonUpdate: OnJsonEditorUpdateHandler = jsonUpdateData => {
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
      const { value: parsed, errors } = validateMappings(unparsed);

      if (errors) {
        setState({ isModalOpen: true, json: { unparsed, parsed }, errors });
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

  const renderErrorsFilterButton = () => {
    const showingAllErrors = totalErrorsToDisplay > MAX_ERRORS_TO_DISPLAY;
    return (
      <EuiButtonEmpty
        onClick={() =>
          setTotalErrorsToDisplay(showingAllErrors ? MAX_ERRORS_TO_DISPLAY : state.errors!.length)
        }
        iconType={showingAllErrors ? 'arrowUp' : 'arrowDown'}
      >
        {showingAllErrors
          ? i18n.translate('xpack.idxMgmt.mappingsEditor.showFirstErrorsButtonLabel', {
              defaultMessage: 'Show first {numErrors} errors',
              values: {
                numErrors: MAX_ERRORS_TO_DISPLAY,
              },
            })
          : i18n.translate('xpack.idxMgmt.mappingsEditor.showAllErrorsButtonLabel', {
              defaultMessage: 'Show {numErrors} more errors',
              values: {
                numErrors: state.errors!.length - MAX_ERRORS_TO_DISPLAY,
              },
            })}
      </EuiButtonEmpty>
    );
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
            maxWidth={600}
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
              <>
                <EuiCallOut
                  title={i18nTexts.validationErrors.title}
                  iconType="alert"
                  color="warning"
                >
                  <EuiText>
                    <p>{i18nTexts.validationErrors.description}</p>
                  </EuiText>
                  <EuiSpacer />
                  <ol>
                    {state.errors!.slice(0, totalErrorsToDisplay).map((error, i) => (
                      <li key={i}>{getErrorMessage(error)}</li>
                    ))}
                  </ol>
                  {state.errors!.length > MAX_ERRORS_TO_DISPLAY && renderErrorsFilterButton()}
                </EuiCallOut>
              </>
            )}
          </EuiConfirmModal>
        </EuiOverlayMask>
      )}
    </>
  );
};
