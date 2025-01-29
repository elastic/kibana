/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { templateFromReactComponent } from '../../../public/lib/template_from_react_component';
import { ShapePickerPopover } from '../../../public/components/shape_picker_popover';
import { ArgumentStrings } from '../../../i18n';

const { Shape: strings } = ArgumentStrings;

const ShapeArgInput = ({ onValueChange, argValue, typeInstance }) => {
  return (
    <EuiFlexGroup gutterSize="s">
      <EuiFlexItem grow={false}>
        <ShapePickerPopover
          value={argValue}
          onChange={onValueChange}
          shapes={typeInstance.options.shapes}
          ariaLabel={typeInstance.displayName}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

ShapeArgInput.propTypes = {
  argValue: PropTypes.any.isRequired,
  onValueChange: PropTypes.func.isRequired,
  typeInstance: PropTypes.shape({
    options: PropTypes.shape({ shapes: PropTypes.object.isRequired }).isRequired,
  }).isRequired,
};

export const shape = () => ({
  name: 'shape',
  displayName: strings.getDisplayName(),
  help: strings.getHelp(),
  simpleTemplate: templateFromReactComponent(ShapeArgInput),
  default: '"square"',
});
