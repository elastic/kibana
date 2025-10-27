/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { VisualizationToolbarProps } from '@kbn/lens-common';
import { ToolbarPopover } from '../../../shared_components';
import type { TagcloudState } from '../types';
import { TagcloudAppearanceSettings } from './appearance_settings';

/**
 * TODO: Remove this file after migration to flyout toolbar
 * See: https://github.com/elastic/kibana/issues/240088
 */

export function TagcloudToolbar(props: VisualizationToolbarProps<TagcloudState>) {
  return (
    <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup alignItems="center" gutterSize="none" responsive={false}>
          <ToolbarPopover
            title={i18n.translate('xpack.lens.tagcloud.appearanceLabel', {
              defaultMessage: 'Appearance',
            })}
            type="visualOptions"
            buttonDataTestSubj="lnsVisualOptionsButton"
            data-test-subj="lnsVisualOptionsPopover"
          >
            <TagcloudAppearanceSettings {...props} />
          </ToolbarPopover>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
