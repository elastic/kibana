/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo } from 'react';
import type { ActionParamsProps } from '@kbn/triggers-actions-ui-plugin/public';
import {
  ActionConnectorMode,
  JsonEditorWithMessageVariables,
} from '@kbn/triggers-actions-ui-plugin/public';
import { EuiFieldText, EuiFormRow, EuiLink } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { DEFAULT_BODY } from './constants';
import * as i18n from './translations';
import { DEFAULT_GEMINI_MODEL, SUB_ACTION } from '../../../common/gemini/constants';
import { GeminiActionParams } from './types';

const GeminiParamsFields: React.FunctionComponent<ActionParamsProps<GeminiActionParams>> = ({
  actionParams,
  editAction,
  index,
  messageVariables,
  executionMode,
  errors,
}) => {
  const { subAction, subActionParams } = actionParams;

  const { body, model } = subActionParams ?? {};

  const isTest = useMemo(() => executionMode === ActionConnectorMode.Test, [executionMode]);

  useEffect(() => {
    if (!subAction) {
      editAction('subAction', isTest ? SUB_ACTION.TEST : SUB_ACTION.RUN, index);
    }
  }, [editAction, index, isTest, subAction]);

  useEffect(() => {
    if (!subActionParams) {
      editAction(
        'subActionParams',
        {
          body: DEFAULT_BODY,
        },
        index
      );
    }
  }, [editAction, index, subActionParams]);

  useEffect(() => {
    return () => {
      // some gemini specific formatting gets messed up if we do not reset
      // subActionParams on dismount (switching tabs between test and config)
      editAction('subActionParams', undefined, index);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const editSubActionParams = useCallback(
    (params: Partial<GeminiActionParams['subActionParams']>) => {
      editAction('subActionParams', { ...subActionParams, ...params }, index);
    },
    [editAction, index, subActionParams]
  );

  return (
    <>
      <JsonEditorWithMessageVariables
        messageVariables={messageVariables}
        paramsProperty={'body'}
        inputTargetValue={body}
        label={i18n.BODY}
        ariaLabel={i18n.BODY_DESCRIPTION}
        errors={errors.body as string[]}
        onDocumentsChange={(json: string) => {
          editSubActionParams({ body: json.trim() });
        }}
        onBlur={() => {
          if (!body) {
            editSubActionParams({ body: '' });
          }
        }}
        dataTestSubj="gemini-bodyJsonEditor"
      />
      <EuiFormRow
        fullWidth
        label={i18n.MODEL}
        helpText={
          <FormattedMessage
            defaultMessage="Optionally overwrite default model per request. Current support is for the Gemini 1.5 models. For more information, refer to the {geminiAPIModelDocs}."
            id="xpack.stackConnectors.components.gemini.modelHelpText"
            values={{
              geminiAPIModelDocs: (
                <EuiLink
                  data-test-subj="gemini-api-model-doc"
                  href="https://ai.google.dev/models/gemini/"
                  target="_blank"
                >
                  {`${i18n.gemini} ${i18n.DOCUMENTATION}`}
                </EuiLink>
              ),
            }}
          />
        }
      >
        <EuiFieldText
          data-test-subj="gemini-model"
          placeholder={DEFAULT_GEMINI_MODEL}
          value={model}
          onChange={(ev) => {
            editSubActionParams({ model: ev.target.value });
          }}
          fullWidth
        />
      </EuiFormRow>
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export { GeminiParamsFields as default };
