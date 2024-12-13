/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC, useState, useMemo, useCallback } from 'react';
import type { EuiCheckboxGroupOption } from '@elastic/eui';
import { EuiCallOut, EuiCheckboxGroup, EuiConfirmModal, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import type { CoreStart, OverlayStart } from '@kbn/core/public';
import { isPopulatedObject } from '@kbn/ml-is-populated-object';
import { isDefined } from '@kbn/ml-is-defined';
import { toMountPoint } from '@kbn/react-kibana-mount';
import type { NLPModelItem } from '../../../common/types/trained_models';

interface ForceStopModelConfirmDialogProps {
  model: NLPModelItem;
  onCancel: () => void;
  onConfirm: (deploymentIds: string[]) => void;
}

/**
 * Confirmation is required when there are multiple model deployments
 * or associated pipelines.
 */
export const StopModelDeploymentsConfirmDialog: FC<ForceStopModelConfirmDialogProps> = ({
  model,
  onConfirm,
  onCancel,
}) => {
  const [checkboxIdToSelectedMap, setCheckboxIdToSelectedMap] = useState<Record<string, boolean>>(
    {}
  );

  const trainedModelDeployments = useMemo<string[]>(() => {
    return (
      model.deployment_ids
        // Filter out deployments that are used by inference services
        .filter((deploymentId) => {
          if (!model.inference_apis) return true;
          return !model.inference_apis.some((inference) => inference.inference_id === deploymentId);
        })
    );
  }, [model]);

  const options: EuiCheckboxGroupOption[] = useMemo(
    () =>
      trainedModelDeployments.map((deploymentId) => {
        return {
          id: deploymentId,
          label: deploymentId,
        };
      }),
    [trainedModelDeployments]
  );

  const onChange = useCallback((id: string) => {
    setCheckboxIdToSelectedMap((prev) => {
      return {
        ...prev,
        [id]: !prev[id],
      };
    });
  }, []);

  const selectedDeploymentIds = useMemo(
    () =>
      trainedModelDeployments.length > 1
        ? Object.keys(checkboxIdToSelectedMap).filter((id) => checkboxIdToSelectedMap[id])
        : trainedModelDeployments,
    [trainedModelDeployments, checkboxIdToSelectedMap]
  );

  const deploymentPipelinesMap = useMemo(() => {
    if (!isPopulatedObject(model.pipelines)) return {};
    return Object.entries(model.pipelines).reduce((acc, [pipelineId, pipelineDef]) => {
      const deploymentIds: string[] = (pipelineDef?.processors ?? [])
        .map((v) => v?.inference?.model_id)
        .filter(isDefined);
      deploymentIds.forEach((dId) => {
        if (acc[dId]) {
          acc[dId].push(pipelineId);
        } else {
          acc[dId] = [pipelineId];
        }
      });
      return acc;
    }, {} as Record<string, string[]>);
  }, [model.pipelines]);

  const pipelineWarning = useMemo<string[]>(() => {
    if (trainedModelDeployments.length === 1 && isPopulatedObject(model.pipelines)) {
      return Object.keys(model.pipelines);
    }
    return [
      ...new Set(
        Object.entries(deploymentPipelinesMap)
          .filter(([deploymentId]) => selectedDeploymentIds.includes(deploymentId))
          .flatMap(([, pipelineNames]) => pipelineNames)
      ),
    ].sort();
  }, [
    trainedModelDeployments.length,
    model.pipelines,
    deploymentPipelinesMap,
    selectedDeploymentIds,
  ]);

  const inferenceServiceIDs = useMemo<string[]>(() => {
    return (model.inference_apis ?? []).map((inference) => inference.inference_id);
  }, [model]);

  return (
    <EuiConfirmModal
      title={i18n.translate('xpack.ml.trainedModels.modelsList.forceStopDialog.title', {
        defaultMessage:
          'Stop {deploymentCount, plural, one {deployment} other {deployments}} of model {modelId}?',
        values: { modelId: model.model_id, deploymentCount: trainedModelDeployments.length },
      })}
      onCancel={onCancel}
      onConfirm={onConfirm.bind(null, selectedDeploymentIds)}
      cancelButtonText={i18n.translate(
        'xpack.ml.trainedModels.modelsList.forceStopDialog.cancelText',
        { defaultMessage: 'Cancel' }
      )}
      confirmButtonText={i18n.translate(
        'xpack.ml.trainedModels.modelsList.forceStopDialog.confirmText',
        { defaultMessage: 'Stop' }
      )}
      buttonColor="danger"
      confirmButtonDisabled={
        trainedModelDeployments.length > 1 && selectedDeploymentIds.length === 0
      }
    >
      {trainedModelDeployments.length > 1 ? (
        <>
          <EuiCheckboxGroup
            legend={{
              display: 'visible',
              children: (
                <FormattedMessage
                  id="xpack.ml.trainedModels.modelsList.forceStopDialog.selectDeploymentsLegend"
                  defaultMessage="Select deployments to stop"
                />
              ),
            }}
            options={options}
            idToSelectedMap={checkboxIdToSelectedMap}
            onChange={onChange}
          />
          <EuiSpacer size={'m'} />
        </>
      ) : null}

      {pipelineWarning.length > 0 ? (
        <>
          <EuiCallOut
            title={
              <FormattedMessage
                id="xpack.ml.trainedModels.modelsList.forceStopDialog.pipelinesWarning"
                defaultMessage="You won't be able to use these ingest pipelines until you restart the model:"
              />
            }
            color="warning"
            iconType="warning"
          >
            <div>
              <ul>
                {pipelineWarning.map((pipelineName) => {
                  return <li key={pipelineName}>{pipelineName}</li>;
                })}
              </ul>
            </div>
          </EuiCallOut>
        </>
      ) : null}

      {model.hasInferenceServices && inferenceServiceIDs.length === 0 ? (
        <EuiCallOut
          title={
            <FormattedMessage
              id="xpack.ml.trainedModels.modelsList.forceStopDialog.hasInferenceServicesWarning"
              defaultMessage="The model is used by the _inference API"
            />
          }
          color="warning"
          iconType="warning"
        />
      ) : null}

      {inferenceServiceIDs.length > 0 ? (
        <>
          <EuiCallOut
            title={
              <FormattedMessage
                id="xpack.ml.trainedModels.modelsList.forceStopDialog.inferenceServicesWarning"
                defaultMessage="The following {inferenceServicesCount, plural, one {deployment is} other {deployments are}} used by the _inference API and can not be stopped:"
                values={{ inferenceServicesCount: inferenceServiceIDs.length }}
              />
            }
            color="warning"
            iconType="warning"
          >
            <div>
              <ul>
                {inferenceServiceIDs.map((deploymentId) => {
                  return <li key={deploymentId}>{deploymentId}</li>;
                })}
              </ul>
            </div>
          </EuiCallOut>
        </>
      ) : null}
    </EuiConfirmModal>
  );
};

export const getUserConfirmationProvider =
  (overlays: OverlayStart, startServices: Pick<CoreStart, 'analytics' | 'i18n' | 'theme'>) =>
  async (forceStopModel: NLPModelItem): Promise<string[]> => {
    return new Promise(async (resolve, reject) => {
      try {
        const modalSession = overlays.openModal(
          toMountPoint(
            <StopModelDeploymentsConfirmDialog
              model={forceStopModel}
              onCancel={() => {
                modalSession.close();
                reject();
              }}
              onConfirm={(deploymentIds: string[]) => {
                modalSession.close();
                resolve(deploymentIds);
              }}
            />,
            startServices
          )
        );
      } catch (e) {
        reject();
      }
    });
  };
