/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiTreeView } from '@elastic/eui';
import { Node } from '@elastic/eui/src/components/tree_view/tree_view';

interface PipelineStructureTreeProps {
  items: Node[];
}

export const PipelineStructureTree = (props: PipelineStructureTreeProps) => {
  return <EuiTreeView items={props.items} showExpansionArrows={true} />;
};
