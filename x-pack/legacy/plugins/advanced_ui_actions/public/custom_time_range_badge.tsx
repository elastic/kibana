/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { TimeRange } from 'ui/timefilter/time_history';
import { prettyDuration, commonDurationRanges } from '@elastic/eui';

import { SEARCH_EMBEDDABLE_TYPE } from '../../../../../src/legacy/core_plugins/kibana/public/discover/embeddable/constants';
import {
  Action,
  IEmbeddable,
  ActionContext,
  IncompatibleActionError,
  Embeddable,
  EmbeddableInput,
} from '../../../../../src/legacy/core_plugins/embeddable_api/public';
import { VisualizeEmbeddable } from '../../../../../src/legacy/core_plugins/kibana/public/visualize/embeddable/visualize_embeddable';
import { VISUALIZE_EMBEDDABLE_TYPE } from '../../../../../src/legacy/core_plugins/kibana/public/visualize/embeddable/constants';

import { CustomizeTimeRangeModal } from './customize_time_range_modal';
import { doesInheritTimeRange } from './does_inherit_time_range';
import { OpenModal } from './shim/types';
import { CommonlyUsedRange } from './types';

export const CUSTOM_TIME_RANGE_BADGE = 'CUSTOM_TIME_RANGE_BADGE';

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

export class CustomTimeRangeBadge extends Action {
  public readonly type = CUSTOM_TIME_RANGE_BADGE;
  private openModal: OpenModal;
  private dateFormat: string;
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
    super(CUSTOM_TIME_RANGE_BADGE);
    this.order = 7;
    this.openModal = openModal;
    this.dateFormat = dateFormat;
    this.commonlyUsedRanges = commonlyUsedRanges;
  }

  public getDisplayName({ embeddable }: ActionContext<Embeddable<TimeRangeInput>>) {
    return prettyDuration(
      embeddable.getInput().timeRange.from,
      embeddable.getInput().timeRange.to,
      commonDurationRanges,
      this.dateFormat
    );
  }

  public getIconType() {
    return 'calendar';
  }

  public async isCompatible({ embeddable }: ActionContext) {
    const isInputControl =
      isVisualizeEmbeddable(embeddable) && embeddable.getOutput().visTypeName === 'inputControl';

    return Boolean(
      embeddable &&
        hasTimeRange(embeddable) &&
        // Saved searches don't listen to the time range from the container that is passed down to them so it
        // won't work without a fix.  For now, just leave them out.
        embeddable.type !== SEARCH_EMBEDDABLE_TYPE &&
        !isInputControl &&
        !doesInheritTimeRange(embeddable)
    );
  }

  public execute({ embeddable }: ActionContext) {
    if (!this.isCompatible({ embeddable })) {
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
