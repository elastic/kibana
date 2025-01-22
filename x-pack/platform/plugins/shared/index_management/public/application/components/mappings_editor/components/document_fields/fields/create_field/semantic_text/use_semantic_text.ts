/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { MlPluginStart } from '@kbn/ml-plugin/public';
import React, { useEffect } from 'react';
import { InferenceTaskType } from '@elastic/elasticsearch/lib/api/types';
import { ElserModels } from '@kbn/ml-trained-models-utils';
import { i18n } from '@kbn/i18n';
import { useDetailsPageMappingsModelManagement } from '../../../../../../../../hooks/use_details_page_mappings_model_management';
import { useDispatch, useMappingsState } from '../../../../../mappings_state_context';
import { FormHook } from '../../../../../shared_imports';
import { CustomInferenceEndpointConfig, Field, SemanticTextField } from '../../../../../types';
import { useMLModelNotificationToasts } from '../../../../../../../../hooks/use_ml_model_status_toasts';

import { getInferenceEndpoints } from '../../../../../../../services/api';
import { getFieldByPathName } from '../../../../../lib/utils';

interface UseSemanticTextProps {
  form: FormHook<Field, Field>;
  ml?: MlPluginStart;
  setErrorsInTrainedModelDeployment?: React.Dispatch<
    React.SetStateAction<Record<string, string | undefined>>
  >;
}
interface DefaultInferenceEndpointConfig {
  taskType: InferenceTaskType;
  service: string;
}

export function useSemanticText(props: UseSemanticTextProps) {
  const { form, setErrorsInTrainedModelDeployment, ml } = props;
  const { fields, mappingViewFields } = useMappingsState();
  const { fetchInferenceToModelIdMap } = useDetailsPageMappingsModelManagement();
  const dispatch = useDispatch();
  const { showSuccessToasts, showErrorToasts } = useMLModelNotificationToasts();

  const fieldTypeValue = form.getFormData()?.type;
  useEffect(() => {
    if (fieldTypeValue === 'semantic_text') {
      const allFields = {
        byId: {
          ...fields.byId,
          ...mappingViewFields.byId,
        },
        rootLevelFields: [],
        aliases: {},
        maxNestedDepth: 0,
      };
      const defaultName = getFieldByPathName(allFields, 'semantic_text') ? '' : 'semantic_text';
      const referenceField =
        Object.values(allFields.byId)
          .find((field) => field.source.type === 'text' && !field.isMultiField)
          ?.path.join('.') || '';
      if (!form.getFormData().name) {
        form.setFieldValue('name', defaultName);
      }
      if (!form.getFormData().reference_field) {
        form.setFieldValue('reference_field', referenceField);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fieldTypeValue]);

  const createInferenceEndpoint = useCallback(
    async (
      trainedModelId: string,
      inferenceId: string,
      customInferenceEndpointConfig?: CustomInferenceEndpointConfig
    ) => {
      const isElser = ElserModels.includes(trainedModelId);
      const defaultInferenceEndpointConfig: DefaultInferenceEndpointConfig = {
        service: isElser ? 'elser' : 'elasticsearch',
        taskType: isElser ? 'sparse_embedding' : 'text_embedding',
      };

      const modelConfig = customInferenceEndpointConfig
        ? customInferenceEndpointConfig.modelConfig
        : {
            service: defaultInferenceEndpointConfig.service,
            service_settings: {
              adaptive_allocations: { enabled: true },
              num_threads: 1,
              model_id: trainedModelId,
            },
          };
      const taskType: InferenceTaskType =
        customInferenceEndpointConfig?.taskType ?? defaultInferenceEndpointConfig.taskType;

      await ml?.mlApi?.inferenceModels?.createInferenceEndpoint(inferenceId, taskType, modelConfig);
    },
    [ml?.mlApi?.inferenceModels]
  );

  const handleSemanticText = async (
    data: SemanticTextField,
    customInferenceEndpointConfig?: CustomInferenceEndpointConfig
  ) => {
    const modelIdMap = await fetchInferenceToModelIdMap();
    const inferenceId = data.inference_id;
    const inferenceData = modelIdMap?.[inferenceId];
    if (!inferenceData) {
      throw new Error(
        i18n.translate('xpack.idxMgmt.mappingsEditor.semanticText.inferenceError', {
          defaultMessage: 'No inference model found for inference ID {inferenceId}',
          values: { inferenceId },
        })
      );
    }

    const { trainedModelId } = inferenceData;
    dispatch({ type: 'field.add', value: data });
    const inferenceEndpoints = await getInferenceEndpoints();
    const hasInferenceEndpoint = inferenceEndpoints.data?.some(
      (inference) => inference.inference_id === inferenceId
    );
    // if inference endpoint exists already, do not create new inference endpoint
    if (hasInferenceEndpoint) {
      return;
    }
    try {
      // Only show toast if it's an internal Elastic model that hasn't been deployed yet
      await createInferenceEndpoint(
        trainedModelId,
        data.inference_id,
        customInferenceEndpointConfig
      );
      if (trainedModelId) {
        if (inferenceData.isDeployable && !inferenceData.isDeployed) {
          showSuccessToasts(trainedModelId);
        }
        // clear error because we've succeeded here
        setErrorsInTrainedModelDeployment?.((prevItems) => ({
          ...prevItems,
          [data.inference_id]: undefined,
        }));
      }
    } catch (error) {
      // trainedModelId is empty string when it's a third party model
      if (trainedModelId) {
        setErrorsInTrainedModelDeployment?.((prevItems) => ({
          ...prevItems,
          [data.inference_id]: error,
        }));
      }
      showErrorToasts(error);
    }
  };

  return {
    createInferenceEndpoint,
    handleSemanticText,
  };
}
