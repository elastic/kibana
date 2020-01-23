/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { templateFromReactComponent } from '../../lib/template_from_react_component';
import { ColorPickerPopover } from '../../components/color_picker_popover';
import { ArgTypesStrings } from '../../../i18n';

const { Color: strings } = ArgTypesStrings;

const ColorArgInput = ({ onValueChange, argValue, workpad, typeInstance }) => (
  <EuiFlexGroup gutterSize="s">
    <EuiFlexItem grow={false}>
      <ColorPickerPopover
        value={argValue}
        onChange={onValueChange}
        colors={workpad.colors}
        ariaLabel={`${typeInstance.displayName} ${strings.getDisplayName()}`}
      />
    </EuiFlexItem>
  </EuiFlexGroup>
);

ColorArgInput.propTypes = {
  argValue: PropTypes.any.isRequired,
  onValueChange: PropTypes.func.isRequired,
  workpad: PropTypes.shape({
    colors: PropTypes.array.isRequired,
  }).isRequired,
};

export const color = () => ({
  name: 'color',
  displayName: strings.getDisplayName(),
  help: strings.getHelp(),
  simpleTemplate: templateFromReactComponent(ColorArgInput),
  default: '#000000',
});
