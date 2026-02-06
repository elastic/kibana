/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React from 'react';
import PropTypes from 'prop-types';
import { EuiSpacer, EuiTitle } from '@elastic/eui';
import { BorderForm } from './border_form';
import { AppearanceForm } from './appearance_form';
import type { CanvasWorkpad } from '../../../../types';
import type { Arguments as AppearanceArguments } from './appearance_form';
import type { Arguments as BorderArguments } from './border_form';
import { ArgTypesStrings } from '../../../../i18n';

export { BorderStyle } from './border_form';

export interface Arguments extends BorderArguments, AppearanceArguments {}
export type ArgumentTypes = Partial<BorderArguments & AppearanceArguments>;
export type Argument = keyof ArgumentTypes;

const { ContainerStyle: strings } = ArgTypesStrings;

interface Props {
  getArgValue: <T extends Argument>(arg: T) => Arguments[T];
  setArgValue: <T extends Argument>(arg: T, val: ArgumentTypes[T]) => void;
  workpad: CanvasWorkpad;
}

export const ExtendedTemplate: FunctionComponent<Props> = ({
  getArgValue,
  setArgValue,
  workpad,
}) => (
  <div>
    <EuiTitle size="xxxs" textTransform="uppercase">
      <h6>{strings.getAppearanceTitle()}</h6>
    </EuiTitle>
    <EuiSpacer size="xs" />
    <EuiSpacer size="xs" />
    <AppearanceForm
      onChange={setArgValue}
      opacity={getArgValue('opacity')}
      overflow={getArgValue('overflow')}
      padding={getArgValue('padding')}
    />
    <EuiSpacer size="m" />
    <EuiTitle size="xxxs" textTransform="uppercase">
      <h6>{strings.getBorderTitle()}</h6>
    </EuiTitle>
    <EuiSpacer size="xs" />
    <EuiSpacer size="xs" />
    <BorderForm
      colors={workpad.colors}
      onChange={setArgValue}
      radius={getArgValue('borderRadius')}
      value={getArgValue('border')}
    />
  </div>
);

ExtendedTemplate.displayName = 'ContainerStyleArgExtendedInput';

ExtendedTemplate.propTypes = {
  getArgValue: PropTypes.func.isRequired,
  setArgValue: PropTypes.func.isRequired,
  // @ts-expect-error upgrade typescript v5.9.3
  workpad: PropTypes.shape({
    colors: PropTypes.array.isRequired,
  }).isRequired,
};
