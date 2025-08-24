/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiPanel } from '@elastic/eui';
import { useKnowledgeBase } from '@kbn/ai-assistant/src/hooks';
import { UISettings } from './ui_settings';
import { getMappedInferenceId } from '../../../helpers/inference_utils';
import { KbDocSetting } from './kb_doc_setting';
import { ProductDocSetting } from './product_doc_setting';

export function SettingsTab() {
  const knowledgeBase = useKnowledgeBase();
  const currentlyDeployedInferenceId = getMappedInferenceId(
    knowledgeBase.status.value?.currentInferenceId
  );

  return (
    <EuiPanel hasBorder grow={false}>
      <KbDocSetting
        knowledgeBase={knowledgeBase}
        currentlyDeployedInferenceId={currentlyDeployedInferenceId}
      />

        <ProductDocSetting
          knowledgeBase={knowledgeBase}
          currentlyDeployedInferenceId={currentlyDeployedInferenceId}
        />
     

      <UISettings knowledgeBase={knowledgeBase} />
    </EuiPanel>
  );
}
