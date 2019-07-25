/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PluginInitializerContext, CoreStart } from 'src/core/public';
import {
  EmbeddablePlugin,
  CONTEXT_MENU_TRIGGER,
  PANEL_BADGE_TRIGGER,
} from '../../../../../../src/legacy/core_plugins/embeddable_api/public';
import { CUSTOM_TIME_RANGE, CustomTimeRangeAction } from '../custom_time_range_action';

import { CUSTOM_TIME_RANGE_BADGE, CustomTimeRangeBadge } from '../custom_time_range_badge';
import { CommonlyUsedRange } from '../types';

export class Plugin {
  constructor(initializerContext: PluginInitializerContext) {}

  public start(core: CoreStart, plugins: { embeddable: EmbeddablePlugin }) {
    const dateFormat = core.uiSettings.get('dateFormat') as string;
    const commonlyUsedRanges = core.uiSettings.get('timepicker:quickRanges') as CommonlyUsedRange[];
    plugins.embeddable.addAction(
      new CustomTimeRangeAction({
        openModal: core.overlays.openModal,
        dateFormat,
        commonlyUsedRanges,
      })
    );

    plugins.embeddable.attachAction({
      triggerId: CONTEXT_MENU_TRIGGER,
      actionId: CUSTOM_TIME_RANGE,
    });

    plugins.embeddable.addAction(
      new CustomTimeRangeBadge({
        openModal: core.overlays.openModal,
        dateFormat,
        commonlyUsedRanges,
      })
    );
    plugins.embeddable.attachAction({
      triggerId: PANEL_BADGE_TRIGGER,
      actionId: CUSTOM_TIME_RANGE_BADGE,
    });
  }

  public stop() {}
}
