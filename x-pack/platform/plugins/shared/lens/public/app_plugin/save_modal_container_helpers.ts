/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LensAppServices } from './types';
import { LENS_EMBEDDABLE_TYPE } from '../../common/constants';
import { LensSerializedState } from '../react_embeddable/types';

export const redirectToDashboard = ({
  embeddableInput,
  dashboardId,
  originatingApp,
  getOriginatingPath,
  stateTransfer,
}: {
  embeddableInput: LensSerializedState;
  dashboardId: string;
  originatingApp?: string;
  getOriginatingPath?: (dashboardId: string) => string | undefined;
  stateTransfer: LensAppServices['stateTransfer'];
}) => {
  const state = {
    input: embeddableInput,
    type: LENS_EMBEDDABLE_TYPE,
  };

  const path =
    getOriginatingPath?.(dashboardId) ??
    (dashboardId === 'new' ? '#/create' : `#/view/${dashboardId}`);
  const appId = originatingApp || 'dashboards';
  stateTransfer.navigateToWithEmbeddablePackage(appId, {
    state,
    path,
  });
};
