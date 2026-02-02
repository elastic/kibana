/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChangeEvent } from 'react';
import React from 'react';
import type { EuiSwitchEvent } from '@elastic/eui';
import { EuiFormRow, EuiSelect, EuiSwitch } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { $Values } from '@kbn/utility-types';
import { Orientation } from '@kbn/expression-tagcloud-plugin/common';
import type { VisualizationToolbarProps } from '@kbn/lens-common';
import type { TagcloudState } from '../types';
import { FontSizeInput } from './font_size_input';

export function TagcloudAppearanceSettings(props: VisualizationToolbarProps<TagcloudState>) {
  return (
    <>
      <EuiFormRow
        display="columnCompressed"
        label={i18n.translate('xpack.lens.label.tagcloud.fontSizeLabel', {
          defaultMessage: 'Font size',
        })}
        fullWidth
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
        fullWidth
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
        fullWidth
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
    </>
  );
}

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
