/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import { TimeRange } from '../../../../../../../src/plugins/data/public';
import { SEARCH_EMBEDDABLE_TYPE } from '../../../../../../../src/legacy/core_plugins/kibana/public/discover/embeddable/search_embeddable';
import { VisualizeEmbeddable } from '../../../../../../../src/legacy/core_plugins/kibana/public/visualize/embeddable/visualize_embeddable';
import { VISUALIZE_EMBEDDABLE_TYPE } from '../../../../../../../src/legacy/core_plugins/kibana/public/visualize/embeddable/constants';

import {
  Action,
  IEmbeddable,
  IncompatibleActionError,
  Embeddable,
  EmbeddableInput,
} from '../../../../../../../src/legacy/core_plugins/embeddable_api/public/np_ready/public';

import { CustomizeTimeRangeModal } from './customize_time_range_modal';
import { OpenModal, CommonlyUsedRange } from './types';

const CUSTOM_TIME_RANGE = 'CUSTOM_TIME_RANGE';

export interface TimeRangeInput extends EmbeddableInput {
  timeRange: TimeRange;
}

function hasTimeRange(
  embeddable: IEmbeddable | Embeddable<TimeRangeInput>
): embeddable is Embeddable<TimeRangeInput> {
  return (embeddable as Embeddable<TimeRangeInput>).getInput().timeRange !== undefined;
}

function isVisualizeEmbeddable(
  embeddable: IEmbeddable | VisualizeEmbeddable
): embeddable is VisualizeEmbeddable {
  return embeddable.type === VISUALIZE_EMBEDDABLE_TYPE;
}

interface ActionContext {
  embeddable: Embeddable<TimeRangeInput>;
}

export class CustomTimeRangeAction extends Action<ActionContext> {
  public readonly type = CUSTOM_TIME_RANGE;
  private openModal: OpenModal;
  private dateFormat?: string;
  private commonlyUsedRanges: CommonlyUsedRange[];

  constructor({
    openModal,
    dateFormat,
    commonlyUsedRanges,
  }: {
    openModal: OpenModal;
    dateFormat: string;
    commonlyUsedRanges: CommonlyUsedRange[];
  }) {
    super(CUSTOM_TIME_RANGE);
    this.order = 7;
    this.openModal = openModal;
    this.dateFormat = dateFormat;
    this.commonlyUsedRanges = commonlyUsedRanges;
  }

  public getDisplayName() {
    return i18n.translate('xpack.advancedUiActions.customizeTimeRangeMenuItem.displayName', {
      defaultMessage: 'Customize time range',
    });
  }

  public getIconType() {
    return 'calendar';
  }

  public async isCompatible({ embeddable }: ActionContext) {
    const isInputControl =
      isVisualizeEmbeddable(embeddable) &&
      (embeddable as VisualizeEmbeddable).getOutput().visTypeName === 'input_control_vis';

    const isMarkdown =
      isVisualizeEmbeddable(embeddable) &&
      (embeddable as VisualizeEmbeddable).getOutput().visTypeName === 'markdown';
    return Boolean(
      embeddable &&
        hasTimeRange(embeddable) &&
        // Saved searches don't listen to the time range from the container that is passed down to them so it
        // won't work without a fix.  For now, just leave them out.
        embeddable.type !== SEARCH_EMBEDDABLE_TYPE &&
        !isInputControl &&
        !isMarkdown
    );
  }

  public async execute({ embeddable }: ActionContext) {
    const isCompatible = await this.isCompatible({ embeddable });
    if (!isCompatible) {
      throw new IncompatibleActionError();
    }

    // Only here for typescript
    if (hasTimeRange(embeddable)) {
      const modalSession = this.openModal(
        <CustomizeTimeRangeModal
          onClose={() => modalSession.close()}
          embeddable={embeddable}
          dateFormat={this.dateFormat}
          commonlyUsedRanges={this.commonlyUsedRanges}
        />
      );
    }
  }
}
