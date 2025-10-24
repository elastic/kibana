/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazy } from 'react';
import { i18n } from '@kbn/i18n';
import type { GenericValidationResult } from '@kbn/triggers-actions-ui-plugin/public/types';
import { formDeserializer, formSerializer } from './form_serialization';
import type { RerankParams, TextEmbeddingParams } from '../../../common/inference/types';
import { SUB_ACTION } from '../../../common/inference/constants';
import {
  INFERENCE_CONNECTOR_ID,
  INFERENCE_CONNECTOR_TITLE,
} from '../../../common/inference/constants';
import type { InferenceActionParams, InferenceConnector } from './types';

interface ValidationErrors {
  subAction: string[];
  input: string[];
  body: string[];
  // rerank only
  query: string[];
  // text_embedding only
  inputType: string[];
}
export function getConnectorType(): InferenceConnector {
  return {
    id: INFERENCE_CONNECTOR_ID,
    iconClass: 'sparkles',
    isExperimental: true,
    selectMessage: i18n.translate('xpack.stackConnectors.components.inference.selectMessageText', {
      defaultMessage: 'Send requests to AI providers such as Amazon Bedrock, OpenAI and more.',
    }),
    selectMessagePreconfigured: i18n.translate(
      'xpack.stackConnectors.components.inference.selectMessagePreconfiguredText',
      {
        defaultMessage: 'Use the Elastic Managed LLM for your chat and RAG use cases.',
      }
    ),
    actionTypeTitle: INFERENCE_CONNECTOR_TITLE,
    validateParams: async (
      actionParams: InferenceActionParams
    ): Promise<GenericValidationResult<ValidationErrors>> => {
      const { subAction, subActionParams } = actionParams;
      const translations = await import('./translations');
      const errors: ValidationErrors = {
        input: [],
        body: [],
        subAction: [],
        inputType: [],
        query: [],
      };

      if (
        subAction === SUB_ACTION.UNIFIED_COMPLETION ||
        subAction === SUB_ACTION.UNIFIED_COMPLETION_STREAM ||
        subAction === SUB_ACTION.UNIFIED_COMPLETION_ASYNC_ITERATOR
      ) {
        let parsedBody;
        try {
          // Attempt to parse the body only if it is a string, otherwise it is already an object
          parsedBody =
            typeof subActionParams.body === 'string'
              ? JSON.parse(subActionParams.body)
              : subActionParams.body;
        } catch {
          errors.body.push(translations.BODY_INVALID);
        }

        if (
          parsedBody &&
          (!parsedBody.messages?.length || !Array.isArray(subActionParams.body.messages))
        ) {
          errors.body.push(translations.getRequiredMessage('Messages'));
        }
      }

      if (
        subAction === SUB_ACTION.COMPLETION ||
        subAction === SUB_ACTION.RERANK ||
        subAction === SUB_ACTION.TEXT_EMBEDDING ||
        subAction === SUB_ACTION.SPARSE_EMBEDDING
      ) {
        if (!subActionParams.input?.length) {
          errors.input.push(translations.getRequiredMessage('Input'));
        }
      }
      if (subAction === SUB_ACTION.RERANK) {
        if (!Array.isArray(subActionParams.input)) {
          errors.input.push(translations.INPUT_INVALID);
        }

        if (!(subActionParams as RerankParams).query?.length) {
          errors.query.push(translations.getRequiredMessage('Query'));
        }
      }
      if (subAction === SUB_ACTION.TEXT_EMBEDDING) {
        if (!(subActionParams as TextEmbeddingParams).inputType?.length) {
          errors.inputType.push(translations.getRequiredMessage('Input type'));
        }
      }
      if (errors.input.length) return { errors };

      // The internal "subAction" param should always be valid, ensure it is only if "subActionParams" are valid
      if (!subAction) {
        errors.subAction.push(translations.getRequiredMessage('Action'));
      } else if (
        ![
          SUB_ACTION.UNIFIED_COMPLETION,
          SUB_ACTION.UNIFIED_COMPLETION_STREAM,
          SUB_ACTION.UNIFIED_COMPLETION_ASYNC_ITERATOR,
          SUB_ACTION.SPARSE_EMBEDDING,
          SUB_ACTION.RERANK,
          SUB_ACTION.TEXT_EMBEDDING,
          SUB_ACTION.COMPLETION,
        ].includes(subAction)
      ) {
        errors.subAction.push(translations.INVALID_ACTION);
      }
      return { errors };
    },
    actionConnectorFields: lazy(() => import('./connector')),
    actionParamsFields: lazy(() => import('./params')),
    actionReadOnlyExtraComponent: lazy(() => import('./usage_cost_message')),
    connectorForm: {
      serializer: formSerializer,
      deserializer: formDeserializer,
      hideSettingsTitle: true,
    },
  };
}
