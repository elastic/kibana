/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiPanel } from '@elastic/eui';
import { useGenAIConnectors, useKnowledgeBase } from '@kbn/ai-assistant/src/hooks';
import { useInferenceEndpoints } from '@kbn/ai-assistant/src/hooks';
import { useKibana } from '../../../hooks/use_kibana';
import { UISettings } from './ui_settings';
import { ProductDocSetting } from './product_doc_setting';
import { ChangeKbModel } from './change_kb_model';
import { getMappedInferenceId } from '../../../helpers/inference_utils';

export function SettingsTab() {
  const { productDocBase } = useKibana().services;

  const knowledgeBase = useKnowledgeBase();
  const { inferenceEndpoints } = useInferenceEndpoints();

  const currentlyDeployedInferenceId = getMappedInferenceId(
    knowledgeBase.status.value?.currentInferenceId,
    inferenceEndpoints
  );

  const connectors = useGenAIConnectors();

  const kbEnabled = Boolean(knowledgeBase.status.value?.enabled);
  const hasConnectors = (connectors.connectors?.length ?? 0) > 0;

  return (
    <EuiPanel hasBorder grow={false}>
      {kbEnabled && hasConnectors && (
        <>
          <ChangeKbModel
            knowledgeBase={knowledgeBase}
            currentlyDeployedInferenceId={currentlyDeployedInferenceId}
          />

          {productDocBase && (
            <ProductDocSetting
              knowledgeBase={knowledgeBase}
              currentlyDeployedInferenceId={currentlyDeployedInferenceId}
            />
          )}
        </>
      )}

      <UISettings knowledgeBase={knowledgeBase} />
    </EuiPanel>
  );
}
