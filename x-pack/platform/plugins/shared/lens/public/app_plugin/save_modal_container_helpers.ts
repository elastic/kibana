/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EmbeddableStateWithType } from '@kbn/embeddable-plugin/common';
import type { LensAppServices } from './types';
import { LENS_EMBEDDABLE_TYPE } from '../../common/constants';
import { extract } from '../../common/embeddable_factory';
import { LensSerializedState } from '../react_embeddable/types';

export const redirectToDashboard = ({
  embeddableInput: rawState,
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
  const { references } = extract(rawState as unknown as EmbeddableStateWithType);

  const appId = originatingApp || 'dashboards';
  stateTransfer.navigateToWithEmbeddablePackage<LensSerializedState>(appId, {
    state: {
      type: LENS_EMBEDDABLE_TYPE,
      serializedState: {
        rawState,
        references,
      },
    },
    path:
      getOriginatingPath?.(dashboardId) ??
      (dashboardId === 'new' ? '#/create' : `#/view/${dashboardId}`),
  });
};
