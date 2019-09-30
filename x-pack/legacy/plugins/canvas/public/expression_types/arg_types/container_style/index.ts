/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ComponentType } from 'react';
import { withHandlers } from 'recompose';
import immutable from 'object-path-immutable';
import { get } from 'lodash';
import { templateFromReactComponent } from '../../../lib/template_from_react_component';
import { Arguments as SimpleArguments, SimpleTemplate } from './simple_template';
import { Arguments as ExtendedArguments, ExtendedTemplate } from './extended_template';
import { ArgTypesStrings } from '../../../../i18n';

const { set } = immutable;
const { ContainerStyle: strings } = ArgTypesStrings;

interface Arguments extends SimpleArguments, ExtendedArguments {}
type ArgumentTypes = Partial<Arguments>;
type Argument = keyof ArgumentTypes;

interface Handlers {
  getArgValue: <T extends Argument>(name: T, alt: Arguments[T]) => Arguments[T];
  setArgValue: <T extends Argument>(name: T, val: ArgumentTypes[T]) => void;
}

interface OuterProps {
  argValue: keyof Arguments;
  onValueChange: Function;
}

const wrap = (Component: ComponentType<any>) =>
  // TODO: this should be in a helper
  withHandlers<OuterProps, Handlers>({
    getArgValue: ({ argValue }) => (name, alt) => {
      const args = get(argValue, 'chain.0.arguments', {});
      return get(args, `${name}.0`, alt);
    },
    setArgValue: ({ argValue, onValueChange }) => (name, val) => {
      const newValue = set(argValue, `chain.0.arguments.${name}.0`, val);
      onValueChange(newValue);
    },
  })(Component);

export const containerStyle = () => ({
  name: 'containerStyle',
  displayName: strings.getDisplayName(),
  help: strings.getHelp(),
  default: '{containerStyle}',
  simpleTemplate: templateFromReactComponent(wrap(SimpleTemplate)),
  template: templateFromReactComponent(wrap(ExtendedTemplate)),
});
