/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MutableRefObject } from 'react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ActionParamsProps } from '@kbn/triggers-actions-ui-plugin/public';
import {
  ActionConnectorMode,
  JsonEditorWithMessageVariables,
} from '@kbn/triggers-actions-ui-plugin/public';
import {
  EuiFieldText,
  EuiFormRow,
  EuiLink,
  EuiSwitch,
  EuiFieldNumber,
  EuiIcon,
  EuiTextColor,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { JsonEditorWithMessageVariablesRef } from '@kbn/triggers-actions-ui-plugin/public/application/components/json_editor_with_message_variables';
import { DEFAULT_BODY } from './constants';
import * as i18n from './translations';
import {
  DEFAULT_BEDROCK_MODEL,
  SUB_ACTION,
  EXTENDED_THINKING_SUPPORTED_MODELS,
  DEFAULT_EXTENDED_THINKING_BUDGET_TOKENS,
  MIN_EXTENDED_THINKING_BUDGET_TOKENS,
  MAX_EXTENDED_THINKING_BUDGET_TOKENS,
} from '../../../common/bedrock/constants';
import type { BedrockActionParams, Config } from './types';

const BedrockParamsFields: React.FunctionComponent<ActionParamsProps<BedrockActionParams>> = ({
  actionParams,
  editAction,
  index,
  messageVariables,
  executionMode,
  errors,
  actionConnector,
}) => {
  const { subAction, subActionParams } = actionParams;
  const connectorConfig =
    actionConnector && 'config' in actionConnector ? actionConnector.config : undefined;

  const { body, model = connectorConfig?.defaultModel as string } = subActionParams ?? {};
  const [extendedThinking, setExtendedThinking] = useState<boolean>(
    (connectorConfig?.extendedThinking as Config['extendedThinking']) || false
  );
  const [budgetTokens, setBudgetTokens] = useState(
    (connectorConfig?.budgetTokens as Config['budgetTokens']) || MIN_EXTENDED_THINKING_BUDGET_TOKENS
  );

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
          body: JSON.stringify({
            ...JSON.parse(DEFAULT_BODY),
            ...(connectorConfig?.extendedThinking
              ? {
                  thinking: {
                    type: 'enabled',
                    budget_tokens: connectorConfig?.budgetTokens || 1024,
                  },
                }
              : {}),
          }),
        },
        index
      );
    }
  }, [connectorConfig, editAction, index, subActionParams]);

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

  const editorRef = useRef<{ setValue: (newValue: string) => void } | null>();

  // Check if the current model supports extended thinking
  const isModelSupported = useMemo(() => {
    const currentModel = model || DEFAULT_BEDROCK_MODEL;
    return EXTENDED_THINKING_SUPPORTED_MODELS.some((supportedModel) =>
      currentModel.includes(supportedModel)
    );
  }, [model]);

  const handleBodyChange = useCallback(
    (newValue: Record<string, any>) => {
      editSubActionParams({
        body: JSON.stringify(newValue),
      });
      editorRef.current?.setValue(JSON.stringify(newValue));
    },
    [editSubActionParams]
  );

  // Handle extended thinking toggle
  const handleExtendedThinkingChange = useCallback(
    (checked: boolean) => {
      if (checked) {
        // Set default budget tokens when enabling extended thinking
        handleBodyChange({
          ...JSON.parse(body || ''),
          thinking: {
            type: 'enabled',
            budget_tokens: budgetTokens,
          },
        });
      } else {
        // Clear budget tokens when disabling extended thinking
        const { thinking, ...bodyWithoutThinking } = JSON.parse(body || (DEFAULT_BODY as string));
        handleBodyChange(bodyWithoutThinking);
      }
      setExtendedThinking(checked);
    },
    [body, budgetTokens, handleBodyChange]
  );

  return (
    <>
      <JsonEditorWithMessageVariables
        ref={editorRef as MutableRefObject<JsonEditorWithMessageVariablesRef>}
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
          <>
            {extendedThinking && !isModelSupported && (
              <p>
                <EuiTextColor color="warning">
                  <EuiIcon type="warningFilled" size="s" />
                  <FormattedMessage
                    id="xpack.stackConnectors.components.bedrock.modelDoesNotSupportReasoning"
                    defaultMessage="Make sure the model supports reasoning"
                  />
                </EuiTextColor>
              </p>
            )}
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
          </>
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
      <>
        <EuiFormRow
          fullWidth
          label={i18n.EXTENDED_THINKING_LABEL}
          helpText={i18n.EXTENDED_THINKING_DESCRIPTION}
        >
          <EuiSwitch
            data-test-subj="bedrock-extended-thinking"
            label={i18n.EXTENDED_THINKING_LABEL}
            checked={extendedThinking || false}
            onChange={(e) => handleExtendedThinkingChange(e.target.checked)}
          />
        </EuiFormRow>

        {extendedThinking && (
          <EuiFormRow
            fullWidth
            label={i18n.EXTENDED_THINKING_BUDGET_TOKENS_LABEL}
            helpText={i18n.EXTENDED_THINKING_BUDGET_TOKENS_DESCRIPTION}
          >
            <EuiFieldNumber
              data-test-subj="bedrock-budget-tokens"
              placeholder={DEFAULT_EXTENDED_THINKING_BUDGET_TOKENS.toString()}
              value={budgetTokens || DEFAULT_EXTENDED_THINKING_BUDGET_TOKENS}
              onChange={(e) => {
                const value = e.target.value === '' ? undefined : Number(e.target.value);
                setBudgetTokens(value || MIN_EXTENDED_THINKING_BUDGET_TOKENS);
                if (extendedThinking) {
                  const bodyObject = JSON.parse(body || '{}');
                  editSubActionParams({
                    body: JSON.stringify({
                      ...bodyObject,
                      thinking: {
                        ...bodyObject.thinking,
                        budget_tokens: value,
                      },
                    }),
                  });
                }
              }}
              min={MIN_EXTENDED_THINKING_BUDGET_TOKENS}
              max={MAX_EXTENDED_THINKING_BUDGET_TOKENS}
              fullWidth
            />
          </EuiFormRow>
        )}
      </>
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export { BedrockParamsFields as default };
