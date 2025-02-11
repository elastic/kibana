/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ChangeEvent } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSelect,
  EuiSwitch,
  EuiSwitchEvent,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { $Values } from '@kbn/utility-types';
import { Orientation } from '@kbn/expression-tagcloud-plugin/common';
import type { VisualizationToolbarProps } from '../../../types';
import { ToolbarPopover } from '../../../shared_components';
import type { TagcloudState } from '../types';
import { FontSizeInput } from './font_size_input';

const ORIENTATION_OPTIONS = [
  {
    value: Orientation.SINGLE,
    text: i18n.translate('xpack.lens.label.tagcloud.orientation.single', {
      defaultMessage: 'Single',
    }),
  },
  {
    value: Orientation.RIGHT_ANGLED,
    text: i18n.translate('xpack.lens.label.tagcloud.orientation.rightAngled', {
      defaultMessage: 'Right angled',
    }),
  },
  {
    value: Orientation.MULTIPLE,
    text: i18n.translate('xpack.lens.label.tagcloud.orientation.multiple', {
      defaultMessage: 'Multiple',
    }),
  },
];

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
            <EuiFormRow
              display="columnCompressed"
              label={i18n.translate('xpack.lens.label.tagcloud.fontSizeLabel', {
                defaultMessage: 'Font size',
              })}
            >
              <FontSizeInput
                minFontSize={props.state.minFontSize}
                maxFontSize={props.state.maxFontSize}
                onChange={(minFontSize: number, maxFontSize: number) => {
                  props.setState({
                    ...props.state,
                    minFontSize,
                    maxFontSize,
                  });
                }}
              />
            </EuiFormRow>
            <EuiFormRow
              display="columnCompressed"
              label={i18n.translate('xpack.lens.label.tagcloud.orientationLabel', {
                defaultMessage: 'Orientation',
              })}
            >
              <EuiSelect
                options={ORIENTATION_OPTIONS}
                value={props.state.orientation}
                onChange={(event: ChangeEvent<HTMLSelectElement>) => {
                  props.setState({
                    ...props.state,
                    orientation: event.target.value as $Values<typeof Orientation>,
                  });
                }}
                compressed
              />
            </EuiFormRow>
            <EuiFormRow
              display="columnCompressed"
              label={i18n.translate('xpack.lens.label.tagcloud.showLabel', {
                defaultMessage: 'Show label',
              })}
            >
              <EuiSwitch
                label={i18n.translate('xpack.lens.label.tagcloud.showLabel', {
                  defaultMessage: 'Show label',
                })}
                showLabel={false}
                checked={props.state.showLabel}
                onChange={(event: EuiSwitchEvent) => {
                  props.setState({
                    ...props.state,
                    showLabel: event.target.checked,
                  });
                }}
                compressed
              />
            </EuiFormRow>
          </ToolbarPopover>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
