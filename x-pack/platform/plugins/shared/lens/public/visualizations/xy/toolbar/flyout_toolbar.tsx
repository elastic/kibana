/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiAccordion, EuiHorizontalRule } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { ContentMap } from '../../../shared_components/flyout_toolbar';
import { FlyoutToolbar } from '../../../shared_components/flyout_toolbar';
import type { VisualizationToolbarProps } from '../../../types';
import type { XYState } from '../types';
import { XyAppearanceSettings } from './visual_options_popover/visual_options_popover';
import { XyTitlesAndTextSettings } from './titles_and_text_popover';

export const XyFlyoutToolbar: React.FC<VisualizationToolbarProps<XYState>> = (props) => {
  const xyToolbarContentMap: ContentMap<XYState> = {
    style: XystyleSettings,
  };
  return <FlyoutToolbar {...props} contentMap={xyToolbarContentMap} />;
};

const XystyleSettings: React.FC<VisualizationToolbarProps<XYState>> = (props) => {
  return (
    <>
      <EuiAccordion
        id={''}
        buttonContent={i18n.translate('xpack.lens.visualization.toolbar.appearance', {
          defaultMessage: 'Appearance',
        })}
        paddingSize="s"
        initialIsOpen
      >
        <XyAppearanceSettings datasourceLayers={props.frame.datasourceLayers} {...props} />
      </EuiAccordion>
      <EuiHorizontalRule margin="m" />
      <EuiAccordion
        id={''}
        buttonContent={i18n.translate('xpack.lens.visualization.toolbar.titlesAndText', {
          defaultMessage: 'Titles and text',
        })}
        paddingSize="s"
        initialIsOpen
      >
        <XyTitlesAndTextSettings datasourceLayers={props.frame.datasourceLayers} {...props} />
      </EuiAccordion>
      {/* TODO: Add axis */}
    </>
  );
};
