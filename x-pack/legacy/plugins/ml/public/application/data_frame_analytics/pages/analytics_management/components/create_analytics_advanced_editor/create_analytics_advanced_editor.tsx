/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, Fragment } from 'react';

import {
  EuiCallOut,
  EuiCodeEditor,
  EuiFieldText,
  EuiForm,
  EuiFormRow,
  EuiSpacer,
  EuiSwitch,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { CreateAnalyticsFormProps } from '../../hooks/use_create_analytics_form';

export const CreateAnalyticsAdvancedEditor: FC<CreateAnalyticsFormProps> = ({ actions, state }) => {
  const {
    resetAdvancedEditorMessages,
    setAdvancedEditorRawString,
    setFormState,
    setJobConfig,
  } = actions;

  const { advancedEditorMessages, advancedEditorRawString, isJobCreated, requestMessages } = state;

  const {
    createIndexPattern,
    destinationIndexPatternTitleExists,
    jobId,
    jobIdEmpty,
    jobIdExists,
    jobIdValid,
  } = state.form;

  const onChange = (str: string) => {
    setAdvancedEditorRawString(str);
    try {
      setJobConfig(JSON.parse(str));
    } catch (e) {
      resetAdvancedEditorMessages();
    }
  };

  return (
    <EuiForm className="mlDataFrameAnalyticsCreateForm">
      {requestMessages.map((requestMessage, i) => (
        <Fragment key={i}>
          <EuiCallOut
            title={requestMessage.message}
            color={requestMessage.error !== undefined ? 'danger' : 'primary'}
            iconType={requestMessage.error !== undefined ? 'alert' : 'checkInCircleFilled'}
            size="s"
          >
            {requestMessage.error !== undefined ? <p>{requestMessage.error}</p> : null}
          </EuiCallOut>
          <EuiSpacer size="s" />
        </Fragment>
      ))}
      {!isJobCreated && (
        <Fragment>
          <EuiFormRow
            label={i18n.translate('xpack.ml.dataframe.analytics.create.advancedEditor.jobIdLabel', {
              defaultMessage: 'Analytics job ID',
            })}
            isInvalid={(!jobIdEmpty && !jobIdValid) || jobIdExists}
            error={[
              ...(!jobIdEmpty && !jobIdValid
                ? [
                    i18n.translate(
                      'xpack.ml.dataframe.analytics.create.advancedEditor.jobIdInvalidError',
                      {
                        defaultMessage:
                          'Must contain lowercase alphanumeric characters (a-z and 0-9), hyphens, and underscores only and must start and end with alphanumeric characters.',
                      }
                    ),
                  ]
                : []),
              ...(jobIdExists
                ? [
                    i18n.translate(
                      'xpack.ml.dataframe.analytics.create.advancedEditor.jobIdExistsError',
                      {
                        defaultMessage: 'An analytics job with this ID already exists.',
                      }
                    ),
                  ]
                : []),
            ]}
          >
            <EuiFieldText
              disabled={isJobCreated}
              placeholder="analytics job ID"
              value={jobId}
              onChange={e => setFormState({ jobId: e.target.value })}
              aria-label={i18n.translate(
                'xpack.ml.dataframe.analytics.create.advancedEditor.jobIdInputAriaLabel',
                {
                  defaultMessage: 'Choose a unique analytics job ID.',
                }
              )}
              isInvalid={(!jobIdEmpty && !jobIdValid) || jobIdExists}
            />
          </EuiFormRow>

          <EuiFormRow
            label={i18n.translate(
              'xpack.ml.dataframe.analytics.create.advancedEditor.configRequestBody',
              {
                defaultMessage: 'Configuration request body',
              }
            )}
            style={{ maxWidth: '100%' }}
          >
            <EuiCodeEditor
              mode="json"
              width="100%"
              value={advancedEditorRawString}
              onChange={onChange}
              setOptions={{
                fontSize: '12px',
                maxLines: 20,
              }}
              theme="textmate"
              aria-label={i18n.translate(
                'xpack.ml.dataframe.analytics.create.advancedEditor.codeEditorAriaLabel',
                {
                  defaultMessage: 'Advanced analytics job editor',
                }
              )}
            />
          </EuiFormRow>
          <EuiSpacer />
          {advancedEditorMessages.map((advancedEditorMessage, i) => (
            <Fragment key={i}>
              <EuiCallOut
                title={
                  advancedEditorMessage.message !== ''
                    ? advancedEditorMessage.message
                    : advancedEditorMessage.error
                }
                color={advancedEditorMessage.error !== undefined ? 'danger' : 'primary'}
                iconType={
                  advancedEditorMessage.error !== undefined ? 'alert' : 'checkInCircleFilled'
                }
                size="s"
              >
                {advancedEditorMessage.message !== '' &&
                advancedEditorMessage.error !== undefined ? (
                  <p>{advancedEditorMessage.error}</p>
                ) : null}
              </EuiCallOut>
              <EuiSpacer />
            </Fragment>
          ))}
          <EuiFormRow
            isInvalid={createIndexPattern && destinationIndexPatternTitleExists}
            error={
              createIndexPattern &&
              destinationIndexPatternTitleExists && [
                i18n.translate(
                  'xpack.ml.dataframe.analytics.create.indexPatternAlreadyExistsError',
                  {
                    defaultMessage: 'An index pattern with this title already exists.',
                  }
                ),
              ]
            }
          >
            <EuiSwitch
              disabled={isJobCreated}
              name="mlDataFrameAnalyticsCreateIndexPattern"
              label={i18n.translate('xpack.ml.dataframe.analytics.create.createIndexPatternLabel', {
                defaultMessage: 'Create index pattern',
              })}
              checked={createIndexPattern === true}
              onChange={() => setFormState({ createIndexPattern: !createIndexPattern })}
            />
          </EuiFormRow>
        </Fragment>
      )}
    </EuiForm>
  );
};
