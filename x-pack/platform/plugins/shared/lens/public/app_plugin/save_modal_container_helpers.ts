/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { v4 as generateId } from 'uuid';
import type { EmbeddablePackageState } from '@kbn/embeddable-plugin/public';
import type { ControlPanelsState } from '@kbn/controls-plugin/common';
import type { ControlsGroupState } from '@kbn/controls-schemas';
import {
  DEFAULT_CONTROLS_CHAINING,
  DEFAULT_CONTROLS_LABEL_POSITION,
  DEFAULT_IGNORE_PARENT_SETTINGS,
  DEFAULT_AUTO_APPLY_SELECTIONS,
  CONTROLS_GROUP_TYPE,
} from '@kbn/controls-constants';
import type { LensAppServices, LensSerializedState } from '@kbn/lens-common';
import { LENS_EMBEDDABLE_TYPE } from '../../common/constants';
import { extractLensReferences } from '../../common/references';

/**
 * Transforms control panels state into controls group state format.
 * @param controlsState - The control panels state to transform
 * @returns Array of control configurations for the controls group
 */
function transformControlPanelsToControlsGroup(
  controlsState?: ControlPanelsState
): ControlsGroupState['controls'] {
  const controls: ControlsGroupState['controls'] = [];

  Object.values(controlsState ?? {}).forEach((panel, idx) => {
    const { width, grow, type, ...controlConfig } = panel;
    const id = generateId();
    controls.push({
      id,
      grow,
      order: idx,
      type,
      width,
      controlConfig,
    });
  });

  return controls;
}

export const redirectToDashboard = ({
  embeddableInput: rawState,
  dashboardId,
  originatingApp,
  getOriginatingPath,
  stateTransfer,
  controlsState,
}: {
  embeddableInput: LensSerializedState;
  dashboardId: string;
  originatingApp?: string;
  getOriginatingPath?: (dashboardId: string) => string | undefined;
  stateTransfer: LensAppServices['stateTransfer'];
  controlsState?: ControlPanelsState;
}) => {
  const { references } = extractLensReferences(rawState);

  const appId = originatingApp || 'dashboards';

  const controls = transformControlPanelsToControlsGroup(controlsState);

  const embeddablePackages: EmbeddablePackageState[] = [
    {
      type: LENS_EMBEDDABLE_TYPE,
      serializedState: {
        rawState,
        references,
      },
    },
  ];

  // Only add controls group if they exist
  if (controls.length > 0) {
    embeddablePackages.push({
      type: CONTROLS_GROUP_TYPE,
      serializedState: {
        rawState: {
          labelPosition: DEFAULT_CONTROLS_LABEL_POSITION,
          chainingSystem: DEFAULT_CONTROLS_CHAINING,
          autoApplySelections: DEFAULT_AUTO_APPLY_SELECTIONS,
          ignoreParentSettings: DEFAULT_IGNORE_PARENT_SETTINGS,
          controls,
        },
        references: [],
      },
    });
  }

  stateTransfer.navigateToWithEmbeddablePackages(appId, {
    state: embeddablePackages,
    path:
      getOriginatingPath?.(dashboardId) ??
      (dashboardId === 'new' ? '#/create' : `#/view/${dashboardId}`),
  });
};
