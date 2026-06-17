/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  HasAppContext,
  HasDisableTriggers,
  HasType,
  PublishesReload,
  PublishesViewMode,
  PublishesUnifiedSearch,
  CanAddNewPanel,
  HasLastSavedChildState,
  HasSerializedChildState,
} from '@kbn/presentation-publishing';

export type CanvasContainerApi = PublishesViewMode &
  CanAddNewPanel &
  HasDisableTriggers &
  HasType &
  HasSerializedChildState &
  HasLastSavedChildState &
  HasAppContext &
  PublishesReload &
  Partial<PublishesUnifiedSearch> &
  Partial<HasAppContext & PublishesUnifiedSearch> & {
    setSerializedStateForChild: (childId: string, panelState: object) => void;
  };
