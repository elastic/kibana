/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { get, mapValues, set } from 'lodash';
import { openSans } from '../../../common/lib/fonts';
import { templateFromReactComponent } from '../../lib/template_from_react_component';
import { TextStylePicker } from '../../components/text_style_picker';
import { ArgTypesStrings } from '../../../i18n';

const { Font: strings } = ArgTypesStrings;

export const FontArgInput = props => {
  const { onValueChange, argValue, workpad } = props;
  const chain = get(argValue, 'chain.0', {});
  const chainArgs = get(chain, 'arguments', {});

  // TODO: Validate input

  const spec = mapValues(chainArgs, '[0]');

  function handleChange(newSpec) {
    const newValue = set(
      argValue,
      ['chain', 0, 'arguments'],
      mapValues(newSpec, v => [v])
    );
    return onValueChange(newValue);
  }

  return (
    <TextStylePicker
      family={spec.family}
      color={spec.color}
      size={spec.size}
      align={spec.align}
      weight={spec.weight}
      underline={spec.underline || false}
      italic={spec.italic || false}
      onChange={handleChange}
      colors={workpad.colors}
    />
  );
};

FontArgInput.propTypes = {
  onValueChange: PropTypes.func.isRequired,
  argValue: PropTypes.any.isRequired,
  typeInstance: PropTypes.object,
  workpad: PropTypes.shape({
    colors: PropTypes.array.isRequired,
  }).isRequired,
};

FontArgInput.displayName = 'FontArgInput';

export const font = () => ({
  name: 'font',
  displayName: strings.getDisplayName(),
  help: strings.getHelp(),
  template: templateFromReactComponent(FontArgInput),
  default: `{font size=14 family="${openSans.value}" color="#000000" align=left}`,
});
