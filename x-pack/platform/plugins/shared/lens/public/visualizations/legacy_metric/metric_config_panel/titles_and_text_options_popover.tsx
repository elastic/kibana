/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { TooltipWrapper } from '@kbn/visualization-utils';
import type { FramePublicAPI, LegacyMetricState } from '@kbn/lens-common';
import { ToolbarPopover } from '../../../shared_components';
import { LegacyMetricTitlesAndTextSettings } from './appearance_settings';

export interface TitlesAndTextPopoverProps {
  state: LegacyMetricState;
  setState: (newState: LegacyMetricState) => void;
  datasourceLayers: FramePublicAPI['datasourceLayers'];
}

export const TitlesAndTextOptionsPopover: React.FC<TitlesAndTextPopoverProps> = ({
  state,
  setState,
}) => {
  return (
    <TooltipWrapper
      tooltipContent={i18n.translate('xpack.lens.shared.titlesAndTextLabel', {
        defaultMessage: 'Titles and text',
      })}
      condition={true}
    >
      <ToolbarPopover
        title={i18n.translate('xpack.lens.shared.metric.titlesAndTextLabel', {
          defaultMessage: 'Titles and text',
        })}
        type="titlesAndText"
        groupPosition="none"
        buttonDataTestSubj="lnsTextOptionsButton"
      >
        <LegacyMetricTitlesAndTextSettings state={state} setState={setState} />
      </ToolbarPopover>
    </TooltipWrapper>
  );
};
