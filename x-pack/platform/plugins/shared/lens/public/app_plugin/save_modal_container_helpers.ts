/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { v4 as generateId } from 'uuid';
import { EmbeddableStateWithType } from '@kbn/embeddable-plugin/common';
import type { ControlPanelsState } from '@kbn/controls-plugin/common';
import type { ControlsGroupState } from '@kbn/controls-schemas';
import {
  DEFAULT_CONTROLS_CHAINING,
  DEFAULT_CONTROLS_LABEL_POSITION,
  DEFAULT_IGNORE_PARENT_SETTINGS,
  DEFAULT_AUTO_APPLY_SELECTIONS,
} from '@kbn/controls-constants';
import { CONTROLS_GROUP_TYPE } from '@kbn/controls-constants';
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
  controlsInput,
}: {
  embeddableInput: LensSerializedState;
  dashboardId: string;
  originatingApp?: string;
  controlsInput?: ControlPanelsState;
  getOriginatingPath?: (dashboardId: string) => string | undefined;
  stateTransfer: LensAppServices['stateTransfer'];
}) => {
  const { references } = extract(rawState as unknown as EmbeddableStateWithType);

  const appId = originatingApp || 'dashboards';
  // const controls: {
  //   type: string;
  //   serializedState: { rawState: ControlPanelState<DefaultControlState> };
  // }[] = [];
  const controls: ControlsGroupState['controls'] = [];
  Object.values(controlsInput ?? {}).forEach((panel, idx) => {
    const { width, grow, type, ...controlConfig } = panel;
    const id = generateId();
    // controls.push({
    //   type: CONTROLS_GROUP_TYPE,
    //   serializedState: {
    //     rawState: panel,
    //   },
    // });
    controls.push({
      id,
      grow,
      order: idx,
      type,
      width,
      controlConfig,
    });
  });
  stateTransfer.navigateToWithMultipleEmbeddablePackage<LensSerializedState | ControlsGroupState>(
    appId,
    {
      state: [
        {
          type: LENS_EMBEDDABLE_TYPE,
          serializedState: {
            rawState,
            references,
          },
        },
        {
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
        },
      ],
      path:
        getOriginatingPath?.(dashboardId) ??
        (dashboardId === 'new' ? '#/create' : `#/view/${dashboardId}`),
    }
  );
};
