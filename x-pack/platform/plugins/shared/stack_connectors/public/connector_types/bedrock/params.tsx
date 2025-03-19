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
import { DEFAULT_BEDROCK_MODEL, SUB_ACTION } from '../../../common/bedrock/constants';
import { BedrockActionParams } from './types';

const BedrockParamsFields: React.FunctionComponent<ActionParamsProps<BedrockActionParams>> = ({
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
      // some bedrock specific formatting gets messed up if we do not reset
      // subActionParams on dismount (switching tabs between test and config)
      editAction('subActionParams', undefined, index);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const editSubActionParams = useCallback(
    (params: Partial<BedrockActionParams['subActionParams']>) => {
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
          // trim to prevent sending extra space at the end of JSON, which causes a timeout error in Bedrock
          editSubActionParams({ body: json.trim() });
        }}
        onBlur={() => {
          if (!body) {
            editSubActionParams({ body: '' });
          }
        }}
        dataTestSubj="bedrock-bodyJsonEditor"
      />
      <EuiFormRow
        fullWidth
        label={i18n.MODEL}
        helpText={
          <FormattedMessage
            defaultMessage="Optionally overwrite default model per request. Current support is for the Anthropic Claude models. For more information, refer to the {bedrockAPIModelDocs}."
            id="xpack.stackConnectors.components.bedrock.modelHelpText"
            values={{
              bedrockAPIModelDocs: (
                <EuiLink
                  data-test-subj="bedrock-api-model-doc"
                  href="https://aws.amazon.com/bedrock/claude/"
                  target="_blank"
                >
                  {`${i18n.BEDROCK} ${i18n.DOCUMENTATION}`}
                </EuiLink>
              ),
            }}
          />
        }
      >
        <EuiFieldText
          data-test-subj="bedrock-model"
          placeholder={DEFAULT_BEDROCK_MODEL}
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
export { BedrockParamsFields as default };
