/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useCallback, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiCheckbox,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSpacer,
} from '@elastic/eui';
import { isPopulatedObject } from '@kbn/ml-is-populated-object';
import type { TrainedModelItem, TrainedModelUIItem } from '../../../common/types/trained_models';
import { isExistingModel } from '../../../common/types/trained_models';
import { type WithRequired } from '../../../common/types/common';
import { useTrainedModelsApiService } from '../services/ml_api_service/trained_models';
import { useToastNotificationService } from '../services/toast_notification_service';
import { DeleteSpaceAwareItemCheckModal } from '../components/delete_space_aware_item_check_modal';

interface DeleteModelsModalProps {
  models: TrainedModelUIItem[];
  onClose: (refreshList?: boolean) => void;
}

export const DeleteModelsModal: FC<DeleteModelsModalProps> = ({ models, onClose }) => {
  const trainedModelsApiService = useTrainedModelsApiService();
  const { displayErrorToast } = useToastNotificationService();

  const [canDeleteModel, setCanDeleteModel] = useState(false);
  const [deletePipelines, setDeletePipelines] = useState<boolean>(false);

  const modelIds = models.map((m) => m.model_id);

  const modelsWithPipelines = models.filter(
    (m): m is WithRequired<TrainedModelItem, 'pipelines'> =>
      isExistingModel(m) && isPopulatedObject(m.pipelines)
  );

  const modelsWithInferenceAPIs = models.filter(
    (m): m is TrainedModelItem => isExistingModel(m) && !!m.hasInferenceServices
  );

  const inferenceAPIsIDs: string[] = modelsWithInferenceAPIs.flatMap((model) => {
    return (model.inference_apis ?? []).map((inference) => inference.inference_id);
  });

  const pipelinesCount = modelsWithPipelines.reduce((acc, curr) => {
    return acc + Object.keys(curr.pipelines).length;
  }, 0);

  const deleteModels = useCallback(async () => {
    try {
      await Promise.all(
        modelIds.map((modelId) =>
          trainedModelsApiService.deleteTrainedModel(modelId, {
            with_pipelines: deletePipelines,
            force: pipelinesCount > 0,
          })
        )
      );
    } catch (error) {
      displayErrorToast(
        error,
        i18n.translate('xpack.ml.trainedModels.modelsList.fetchDeletionErrorMessage', {
          defaultMessage: '{modelsCount, plural, one {Model} other {Models}} deletion failed',
          values: {
            modelsCount: modelIds.length,
          },
        })
      );
    }
    onClose(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelIds, trainedModelsApiService, deletePipelines, pipelinesCount]);

  return canDeleteModel ? (
    <EuiModal
      onClose={onClose.bind(null, false)}
      initialFocus="[name=cancelModelDeletion]"
      data-test-subj="mlModelsDeleteModal"
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle>
          <FormattedMessage
            id="xpack.ml.trainedModels.modelsList.deleteModal.header"
            defaultMessage="Delete {modelsCount, plural, one {{modelId}} other {# models}}?"
            values={{
              modelId: modelIds[0],
              modelsCount: modelIds.length,
            }}
          />
        </EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        {modelsWithPipelines.length > 0 ? (
          <>
            <EuiCallOut
              title={
                <FormattedMessage
                  id="xpack.ml.trainedModels.modelsList.deleteModal.pipelinesWarningHeader"
                  defaultMessage="{modelsCount, plural, one {{modelId} has} other {# models have}} associated pipelines."
                  values={{
                    modelsCount: modelsWithPipelines.length,
                    modelId: modelsWithPipelines[0].model_id,
                  }}
                />
              }
              color="warning"
              iconType="warning"
            >
              <div>
                <p>
                  <FormattedMessage
                    id="xpack.ml.trainedModels.modelsList.deleteModal.warningMessage"
                    defaultMessage="Deleting the trained model and its associated {pipelinesCount, plural, one {pipeline} other {pipelines}} will permanently remove these resources. Any process configured to send data to the {pipelinesCount, plural, one {pipeline} other {pipelines}} will no longer be able to do so once you delete the {pipelinesCount, plural, one {pipeline} other {pipelines}}. Deleting only the trained model will cause failures in the {pipelinesCount, plural, one {pipeline} other {pipelines}} that {pipelinesCount, plural, one {depends} other {depend}} on the model."
                    values={{ pipelinesCount }}
                  />
                </p>
                <EuiCheckbox
                  id={'delete-model-pipelines'}
                  label={
                    <FormattedMessage
                      id="xpack.ml.trainedModels.modelsList.deleteModal.approvePipelinesDeletionLabel"
                      defaultMessage="Delete {pipelinesCount, plural, one {pipeline} other {pipelines}}"
                      values={{ pipelinesCount }}
                    />
                  }
                  checked={deletePipelines}
                  onChange={setDeletePipelines.bind(null, (prev) => !prev)}
                  data-test-subj="mlModelsDeleteModalDeletePipelinesCheckbox"
                />
              </div>
              <ul>
                {modelsWithPipelines.flatMap((model) => {
                  return Object.keys(model.pipelines).map((pipelineId) => (
                    <li key={pipelineId}>{pipelineId}</li>
                  ));
                })}
              </ul>
            </EuiCallOut>
            <EuiSpacer size="m" />
          </>
        ) : null}

        {modelsWithInferenceAPIs.length > 0 ? (
          <EuiCallOut
            title={
              <FormattedMessage
                id="xpack.ml.trainedModels.modelsList.deleteModal.inferenceAPIWarningHeader"
                defaultMessage="{modelsCount, plural, one {{modelId} has} other {# models have}} associated inference services."
                values={{
                  modelsCount: modelsWithInferenceAPIs.length,
                  modelId: modelsWithInferenceAPIs[0].model_id,
                }}
              />
            }
            color="warning"
            iconType="warning"
          >
            <ul>
              {inferenceAPIsIDs.map((inferenceAPIModelId) => (
                <li key={inferenceAPIModelId}>{inferenceAPIModelId}</li>
              ))}
            </ul>

            <div>
              <p>
                <FormattedMessage
                  id="xpack.ml.trainedModels.modelsList.deleteModal.warningInferenceMessage"
                  defaultMessage="Deleting the trained model will cause failures in the inference {inferenceAPIsCount, plural, one {service} other {services}} that {inferenceAPIsCount, plural, one {depends} other {depend}} on the model."
                  values={{ inferenceAPIsCount: inferenceAPIsIDs.length }}
                />
              </p>
            </div>
          </EuiCallOut>
        ) : null}
      </EuiModalBody>

      <EuiModalFooter>
        <EuiButtonEmpty onClick={onClose.bind(null, false)} name="cancelModelDeletion">
          <FormattedMessage
            id="xpack.ml.trainedModels.modelsList.deleteModal.cancelButtonLabel"
            defaultMessage="Cancel"
          />
        </EuiButtonEmpty>

        <EuiButton
          onClick={deleteModels.bind(null)}
          fill
          color="danger"
          data-test-subj="mlModelsDeleteModalConfirmButton"
        >
          <FormattedMessage
            id="xpack.ml.trainedModels.modelsList.deleteModal.deleteButtonLabel"
            defaultMessage="Delete"
          />
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  ) : (
    <DeleteSpaceAwareItemCheckModal
      ids={modelIds}
      mlSavedObjectType="trained-model"
      canDeleteCallback={setCanDeleteModel.bind(null, true)}
      onCloseCallback={onClose.bind(null, true)}
      refreshJobsCallback={() => {}}
      hasManagedJob={false}
    />
  );
};
