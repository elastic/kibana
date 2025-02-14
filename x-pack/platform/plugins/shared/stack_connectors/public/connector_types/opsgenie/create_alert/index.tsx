/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy, Suspense, useCallback, useState } from 'react';
import {
  ActionParamsProps,
  TextAreaWithMessageVariables,
  TextFieldWithMessageVariables,
  SectionLoading,
} from '@kbn/triggers-actions-ui-plugin/public';
import {
  EuiErrorBoundary,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSpacer,
  EuiSwitch,
  EuiSwitchEvent,
} from '@elastic/eui';
import type {
  OpsgenieActionParams,
  OpsgenieCreateAlertParams,
} from '../../../../server/connector_types';
import * as i18n from './translations';
import { EditActionCallback } from '../types';
import { DisplayMoreOptions } from '../display_more_options';
import { AdditionalOptions } from './additional_options';
import { Tags } from './tags';
import { Priority } from './priority';
import type { JsonEditorProps } from './json_editor';
import { OptionalFieldLabel } from '../../../common/optional_field_label';

const JsonEditorLazy: React.FC<JsonEditorProps> = lazy(() => import('./json_editor'));

type FormViewProps = Omit<CreateAlertProps, 'editAction'>;

const FormView: React.FC<FormViewProps> = ({
  editSubAction,
  editOptionalSubAction,
  errors,
  index,
  messageVariables,
  subActionParams,
  showSaveError,
  executionMode,
}) => {
  const isMessageInvalid =
    (errors['subActionParams.message'] !== undefined &&
      Number(errors['subActionParams.message'].length) > 0 &&
      subActionParams?.message !== undefined) ||
    showSaveError;

  return (
    <>
      <EuiFormRow
        data-test-subj="opsgenie-message-row"
        fullWidth
        error={errors['subActionParams.message'] as string}
        label={i18n.MESSAGE_FIELD_LABEL}
        isInvalid={isMessageInvalid}
      >
        <TextFieldWithMessageVariables
          index={index}
          editAction={editSubAction}
          messageVariables={messageVariables}
          paramsProperty={'message'}
          inputTargetValue={subActionParams?.message}
          errors={errors['subActionParams.message'] as string[]}
        />
      </EuiFormRow>
      <EuiSpacer size={'m'} />
      <EuiFlexGroup>
        <EuiFlexItem>
          <Tags
            values={subActionParams?.tags ?? []}
            onChange={editOptionalSubAction}
            executionMode={executionMode}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <Priority priority={subActionParams?.priority} onChange={editOptionalSubAction} />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size={'m'} />

      <TextAreaWithMessageVariables
        index={index}
        editAction={editOptionalSubAction}
        messageVariables={messageVariables}
        paramsProperty={'description'}
        label={i18n.DESCRIPTION_FIELD_LABEL}
        inputTargetValue={subActionParams?.description}
        isOptionalField
      />
      <EuiSpacer size={'m'} />
      <EuiFormRow
        data-test-subj="opsgenie-alias-row"
        fullWidth
        label={i18n.ALIAS_FIELD_LABEL}
        helpText={i18n.OPSGENIE_ALIAS_HELP}
        labelAppend={OptionalFieldLabel}
      >
        <TextFieldWithMessageVariables
          index={index}
          editAction={editOptionalSubAction}
          messageVariables={messageVariables}
          paramsProperty={'alias'}
          inputTargetValue={subActionParams?.alias}
        />
      </EuiFormRow>
    </>
  );
};

FormView.displayName = 'FormView';

export type CreateAlertProps = Pick<
  ActionParamsProps<OpsgenieActionParams>,
  'errors' | 'index' | 'messageVariables' | 'editAction' | 'executionMode'
> & {
  subActionParams?: Partial<OpsgenieCreateAlertParams>;
  editSubAction: EditActionCallback;
  editOptionalSubAction: EditActionCallback;
  showSaveError: boolean;
};

const CreateAlertComponent: React.FC<CreateAlertProps> = ({
  editSubAction,
  editAction,
  editOptionalSubAction,
  errors,
  index,
  messageVariables,
  subActionParams,
  showSaveError,
  executionMode,
}) => {
  const [showingMoreOptions, setShowingMoreOptions] = useState<boolean>(false);
  const [showJsonEditor, setShowJsonEditor] = useState<boolean>(false);

  const toggleShowJsonEditor = useCallback(
    (event: EuiSwitchEvent) => {
      if (!event.target.checked) {
        // when the user switches back remove the json editor error if there was one
        // must mark as undefined to remove the field so it is not sent to the server side
        editAction('jsonEditorError', undefined, index);
      }
      setShowJsonEditor(event.target.checked);
    },
    [editAction, index]
  );

  const toggleShowingMoreOptions = useCallback(
    () => setShowingMoreOptions((previousState) => !previousState),
    []
  );

  return (
    <>
      <EuiSpacer size={'m'} />
      <EuiSwitch
        label={i18n.USE_JSON_EDITOR_LABEL}
        checked={showJsonEditor}
        onChange={toggleShowJsonEditor}
        data-test-subj="opsgenie-show-json-editor-toggle"
      />
      <EuiSpacer size={'m'} />
      {showJsonEditor ? (
        <EuiErrorBoundary>
          <Suspense fallback={<SectionLoading>{i18n.LOADING_JSON_EDITOR}</SectionLoading>}>
            <JsonEditorLazy
              editAction={editAction}
              index={index}
              messageVariables={messageVariables}
              subActionParams={subActionParams}
            />
          </Suspense>
        </EuiErrorBoundary>
      ) : (
        <>
          <FormView
            editOptionalSubAction={editOptionalSubAction}
            editSubAction={editSubAction}
            errors={errors}
            index={index}
            messageVariables={messageVariables}
            subActionParams={subActionParams}
            showSaveError={showSaveError}
          />
          {showingMoreOptions ? (
            <AdditionalOptions
              subActionParams={subActionParams}
              editOptionalSubAction={editOptionalSubAction}
              messageVariables={messageVariables}
              index={index}
            />
          ) : null}
          <EuiSpacer size={'m'} />
          <DisplayMoreOptions
            showingMoreOptions={showingMoreOptions}
            toggleShowingMoreOptions={toggleShowingMoreOptions}
          />
        </>
      )}
    </>
  );
};

CreateAlertComponent.displayName = 'CreateAlert';

export const CreateAlert = React.memo(CreateAlertComponent);

export { isPartialCreateAlertSchema } from './schema';
