/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  JsonEditorWithMessageVariables,
  useKibana,
  type ActionParamsProps,
} from '@kbn/triggers-actions-ui-plugin/public';
import { isInferenceEndpointExists } from '@kbn/inference-endpoint-ui-common';
import { EuiTextArea, EuiFormRow, EuiSpacer, EuiSelect, EuiCallOut } from '@elastic/eui';
import type { RuleFormParamsErrors } from '@kbn/response-ops-rule-form';
import { ActionVariable } from '@kbn/alerting-types';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  ChatCompleteParams,
  RerankParams,
  SparseEmbeddingParams,
  TextEmbeddingParams,
  UnifiedChatCompleteParams,
} from '../../../common/inference/types';
import { DEFAULTS_BY_TASK_TYPE } from './constants';
import * as i18n from './translations';
import { SUB_ACTION } from '../../../common/inference/constants';
import { InferenceActionConnector, InferenceActionParams } from './types';

const InferenceServiceParamsFields: React.FunctionComponent<
  ActionParamsProps<InferenceActionParams>
> = ({ actionParams, editAction, index, errors, actionConnector, messageVariables }) => {
  const { subAction, subActionParams } = actionParams;
  const [isEndpointExists, setIsInferenceEndpointExists] = useState<boolean>(true);

  const {
    services: { http },
  } = useKibana();

  const { taskType, provider, inferenceId } = (
    actionConnector as unknown as InferenceActionConnector
  ).config;

  useEffect(() => {
    const f = async () => {
      setIsInferenceEndpointExists(await isInferenceEndpointExists(http, inferenceId));
    };
    f();
  }, [http, inferenceId]);

  useEffect(() => {
    if (!subAction) {
      editAction(
        'subAction',
        taskType === 'chat_completion' ? SUB_ACTION.UNIFIED_COMPLETION : taskType,
        index
      );
    }
  }, [editAction, index, provider, subAction, taskType]);

  useEffect(() => {
    if (!subActionParams) {
      editAction(
        'subActionParams',
        {
          ...(DEFAULTS_BY_TASK_TYPE[
            taskType === 'chat_completion' ? SUB_ACTION.UNIFIED_COMPLETION : taskType
          ] ?? {}),
        },
        index
      );
    }
  }, [editAction, index, provider, subActionParams, taskType]);

  const editSubActionParams = useCallback(
    (params: Partial<InferenceActionParams['subActionParams']>) => {
      editAction('subActionParams', { ...subActionParams, ...params }, index);
    },
    [editAction, index, subActionParams]
  );

  if (!isEndpointExists) {
    return (
      <EuiCallOut title="Missing configuration" color="warning" iconType="warning">
        <FormattedMessage
          id="xpack.stackConnectors.components.inference.loadingErrorText"
          defaultMessage={'Inference Endpoint by ID {inferenceId} does not exist!'}
          values={{ inferenceId }}
        />
      </EuiCallOut>
    );
  }

  if (subAction === SUB_ACTION.UNIFIED_COMPLETION) {
    return (
      <UnifiedCompletionParamsFields
        errors={errors}
        messageVariables={messageVariables}
        editSubActionParams={editSubActionParams}
        subActionParams={subActionParams as UnifiedChatCompleteParams}
      />
    );
  }

  if (subAction === SUB_ACTION.UNIFIED_COMPLETION_ASYNC_ITERATOR) {
    return (
      <UnifiedCompletionParamsFields
        errors={errors}
        messageVariables={messageVariables}
        editSubActionParams={editSubActionParams}
        subActionParams={subActionParams as UnifiedChatCompleteParams}
      />
    );
  }

  if (subAction === SUB_ACTION.COMPLETION) {
    return (
      <CompletionParamsFields
        errors={errors}
        editSubActionParams={editSubActionParams}
        subActionParams={subActionParams as ChatCompleteParams}
      />
    );
  }

  if (subAction === SUB_ACTION.RERANK) {
    return (
      <RerankParamsFields
        errors={errors}
        editSubActionParams={editSubActionParams}
        subActionParams={subActionParams as RerankParams}
      />
    );
  }

  if (subAction === SUB_ACTION.SPARSE_EMBEDDING) {
    return (
      <SparseEmbeddingParamsFields
        errors={errors}
        editSubActionParams={editSubActionParams}
        subActionParams={subActionParams as SparseEmbeddingParams}
      />
    );
  }

  if (subAction === SUB_ACTION.TEXT_EMBEDDING) {
    return (
      <TextEmbeddingParamsFields
        errors={errors}
        editSubActionParams={editSubActionParams}
        subActionParams={subActionParams as TextEmbeddingParams}
      />
    );
  }

  return <></>;
};

const InferenceInput: React.FunctionComponent<{
  input?: string;
  inputError?: string;
  editSubActionParams: (params: Partial<InferenceActionParams['subActionParams']>) => void;
}> = ({ input, inputError, editSubActionParams }) => {
  return (
    <EuiFormRow fullWidth error={inputError} isInvalid={false} label={i18n.INPUT}>
      <EuiTextArea
        data-test-subj="inferenceInput"
        name="input"
        value={input}
        onChange={(e) => {
          editSubActionParams({ input: e.target.value });
        }}
        isInvalid={false}
        fullWidth={true}
      />
    </EuiFormRow>
  );
};

const UnifiedCompletionParamsFields: React.FunctionComponent<{
  subActionParams: UnifiedChatCompleteParams;
  errors: RuleFormParamsErrors;
  editSubActionParams: (params: Partial<InferenceActionParams['subActionParams']>) => void;
  messageVariables: ActionVariable[] | undefined;
}> = ({ subActionParams, editSubActionParams, errors, messageVariables }) => {
  const { body } = subActionParams ?? {};

  return (
    <>
      <JsonEditorWithMessageVariables
        messageVariables={messageVariables}
        paramsProperty={'body'}
        inputTargetValue={JSON.stringify(body)}
        label={i18n.BODY}
        errors={errors.body as string[]}
        onDocumentsChange={(json: string) => {
          editSubActionParams({ body: JSON.parse(json) });
        }}
        onBlur={() => {
          if (!subActionParams.body) {
            editSubActionParams({ body: { messages: [] } });
          }
        }}
        dataTestSubj="inference-bodyJsonEditor"
      />
    </>
  );
};

const CompletionParamsFields: React.FunctionComponent<{
  subActionParams: ChatCompleteParams;
  errors: RuleFormParamsErrors;
  editSubActionParams: (params: Partial<InferenceActionParams['subActionParams']>) => void;
}> = ({ subActionParams, editSubActionParams, errors }) => {
  const { input } = subActionParams;

  return (
    <InferenceInput
      input={input}
      editSubActionParams={editSubActionParams}
      inputError={errors.input as string}
    />
  );
};

const SparseEmbeddingParamsFields: React.FunctionComponent<{
  subActionParams: SparseEmbeddingParams;
  errors: RuleFormParamsErrors;
  editSubActionParams: (params: Partial<InferenceActionParams['subActionParams']>) => void;
}> = ({ subActionParams, editSubActionParams, errors }) => {
  const { input } = subActionParams;

  return (
    <InferenceInput
      input={input}
      editSubActionParams={editSubActionParams}
      inputError={errors.input as string}
    />
  );
};

const TextEmbeddingParamsFields: React.FunctionComponent<{
  subActionParams: TextEmbeddingParams;
  errors: RuleFormParamsErrors;
  editSubActionParams: (params: Partial<InferenceActionParams['subActionParams']>) => void;
}> = ({ subActionParams, editSubActionParams, errors }) => {
  const { input, inputType } = subActionParams;

  const options = [
    { value: 'ingest', text: 'ingest' },
    { value: 'search', text: 'search' },
  ];

  return (
    <>
      <EuiFormRow
        fullWidth
        error={errors.inputType as string}
        isInvalid={false}
        label={i18n.INPUT_TYPE}
      >
        <EuiSelect
          data-test-subj="inferenceInputType"
          fullWidth
          name="inputType"
          isInvalid={false}
          options={options}
          value={inputType}
          onChange={(e) => {
            editSubActionParams({ inputType: e.target.value });
          }}
        />
      </EuiFormRow>
      <EuiSpacer size="s" />
      <InferenceInput
        input={input}
        editSubActionParams={editSubActionParams}
        inputError={errors.input as string}
      />
    </>
  );
};

const RerankParamsFields: React.FunctionComponent<{
  subActionParams: RerankParams;
  errors: RuleFormParamsErrors;
  editSubActionParams: (params: Partial<InferenceActionParams['subActionParams']>) => void;
}> = ({ subActionParams, editSubActionParams, errors }) => {
  const { input, query } = subActionParams;

  return (
    <>
      <JsonEditorWithMessageVariables
        paramsProperty={'input'}
        inputTargetValue={JSON.stringify(input)}
        label={i18n.INPUT}
        errors={errors.input as string[]}
        onDocumentsChange={(json: string) => {
          editSubActionParams({ input: json.trim() });
        }}
        onBlur={() => {
          if (!input) {
            editSubActionParams({ input: [] });
          }
        }}
        dataTestSubj="inference-inputJsonEditor"
      />
      <EuiSpacer size="s" />
      <EuiFormRow fullWidth error={errors.input as string} isInvalid={false} label={i18n.QUERY}>
        <EuiTextArea
          data-test-subj="inferenceQuery"
          name="query"
          value={query}
          onChange={(e) => {
            editSubActionParams({ query: e.target.value });
          }}
          isInvalid={false}
          fullWidth={true}
        />
      </EuiFormRow>
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export { InferenceServiceParamsFields as default };
