/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { ColorPickerPopover, Props } from '../color_picker_popover';
import { ComponentStrings } from '../../../i18n';

const { WorkpadConfig: strings } = ComponentStrings;

export const WorkpadColorPicker = (props: Props) => {
  return (
    <ColorPickerPopover
      {...props}
      hasButtons={true}
      ariaLabel={strings.getBackgroundColorLabel()}
    />
  );
};

WorkpadColorPicker.propTypes = ColorPickerPopover.propTypes;
