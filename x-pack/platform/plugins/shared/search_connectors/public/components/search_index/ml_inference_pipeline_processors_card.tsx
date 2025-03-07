/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import { useActions, useValues } from 'kea';

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { useKibana } from '@kbn/kibana-react-plugin/public';
import { PipelinesLogic } from './pipelines_logic';
import { useAppContext } from '../../app_context';
import { IndexNameLogic } from './index_name_logic';
import { AddMLInferencePipelineButton } from './ml_inference/add_ml_inference_button';

export const MlInferencePipelineProcessorsCard: React.FC = () => {
  const {
    services: { application },
  } = useKibana();
  const { hasPlatinumLicense, isCloud } = useAppContext();
  const { indexName } = useValues(IndexNameLogic);
  const { mlInferencePipelineProcessors: inferencePipelines } = useValues(PipelinesLogic);
  const { fetchMlInferenceProcessors, openAddMlInferencePipelineModal } =
    useActions(PipelinesLogic);
  useEffect(() => {
    fetchMlInferenceProcessors({ indexName });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [indexName]);

  const hasMLPermissions = application?.capabilities?.ml?.canGetTrainedModels ?? false;
  const isGated = !isCloud && !hasPlatinumLicense;

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      {hasMLPermissions && !isGated && <TextExpansionCallOut isDismissable />}
      <EuiFlexItem>
        <AddMLInferencePipelineButton onClick={() => openAddMlInferencePipelineModal()} />
      </EuiFlexItem>
      {inferencePipelines?.map((item: InferencePipeline, index: number) => (
        <EuiFlexItem key={`${index}-${item.pipelineName}`}>
          <InferencePipelineCard {...item} />
        </EuiFlexItem>
      )) ?? null}
    </EuiFlexGroup>
  );
};
