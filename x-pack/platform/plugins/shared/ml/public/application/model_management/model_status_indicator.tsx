/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { MODEL_STATE } from '@kbn/ml-trained-models-utils';
import { EuiProgress, EuiFlexItem, EuiFlexGroup, EuiText } from '@elastic/eui';

import useObservable from 'react-use/lib/useObservable';
import { isBaseNLPModelItem } from '../../../common/types/trained_models';
import type { NameOverrides } from './get_model_state';
import { getModelStateColor } from './get_model_state';
import { useMlKibana } from '../contexts/kibana';

export const ModelStatusIndicator = ({
  modelId,
  configOverrides,
}: {
  modelId: string;
  configOverrides?: {
    color?: string;
    names?: NameOverrides;
  };
}) => {
  const {
    services: {
      mlServices: { trainedModelsService },
    },
  } = useMlKibana();

  const currentModel = useObservable(
    trainedModelsService.getModel$(modelId),
    trainedModelsService.getModel(modelId)
  );

  if (!currentModel || !isBaseNLPModelItem(currentModel)) {
    return null;
  }

  const { state, downloadState } = currentModel;
  const config = getModelStateColor(state, configOverrides?.names);

  if (!config) {
    return null;
  }

  const isProgressbarVisible = state === MODEL_STATE.DOWNLOADING && downloadState;

  const label = (
    <EuiText size="xs" color={config.color}>
      {config.name}
    </EuiText>
  );

  return (
    <EuiFlexGroup direction={'column'} gutterSize={'none'} css={{ width: '100%' }}>
      {isProgressbarVisible ? (
        <EuiFlexItem>
          <EuiProgress
            label={config.name}
            labelProps={{
              ...(configOverrides?.color && {
                css: {
                  color: configOverrides.color,
                },
              }),
            }}
            valueText={
              <>
                {downloadState
                  ? (
                      (downloadState.downloaded_parts / (downloadState.total_parts || -1)) *
                      100
                    ).toFixed(0) + '%'
                  : '100%'}
              </>
            }
            value={downloadState?.downloaded_parts ?? 1}
            max={downloadState?.total_parts ?? 1}
            size="xs"
            color={config.color}
          />
        </EuiFlexItem>
      ) : (
        <EuiFlexItem grow={false}>
          <span>{config.component ?? label}</span>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
