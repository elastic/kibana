/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataStreamResponse } from '../../../../common';

export interface UIState {
  isCreateDataStreamFlyoutOpen: boolean;
  isEditPipelineFlyoutOpen: boolean;
  selectedDataStream: DataStreamResponse | null;
}

export interface UIStateActions {
  openCreateDataStreamFlyout: () => void;
  closeCreateDataStreamFlyout: () => void;
  openEditPipelineFlyout: (dataStream: DataStreamResponse) => void;
  closeEditPipelineFlyout: () => void;
  selectPipelineTab: (tab: 'table' | 'pipeline') => void;
  selectedPipelineTab: 'table' | 'pipeline';
}

export type UIStateContextValue = UIState & UIStateActions;
