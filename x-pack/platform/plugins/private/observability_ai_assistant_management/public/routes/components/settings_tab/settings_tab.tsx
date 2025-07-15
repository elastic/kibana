/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiPanel } from '@elastic/eui';
import { useGenAIConnectors, useKnowledgeBase } from '@kbn/ai-assistant/src/hooks';
import { useKibana } from '../../../hooks/use_kibana';
import { UISettings } from './ui_settings';
import { ProductDocEntry } from './product_doc_entry';
import { ChangeKbModel } from './change_kb_model';

export function SettingsTab() {
  const { productDocBase } = useKibana().services;

  const knowledgeBase = useKnowledgeBase();
  const connectors = useGenAIConnectors();

  return (
    <EuiPanel hasBorder grow={false}>
      {productDocBase ? <ProductDocEntry /> : undefined}

      {knowledgeBase.status.value?.enabled && connectors.connectors?.length ? (
        <ChangeKbModel knowledgeBase={knowledgeBase} />
      ) : undefined}

      <UISettings knowledgeBase={knowledgeBase} />
    </EuiPanel>
  );
}
