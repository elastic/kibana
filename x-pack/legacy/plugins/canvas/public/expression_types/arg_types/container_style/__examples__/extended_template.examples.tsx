/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { action } from '@storybook/addon-actions';
import { storiesOf } from '@storybook/react';
import React from 'react';
// @ts-ignore Untyped local
import { getDefaultWorkpad } from '../../../../state/defaults';

import { Arguments, ArgumentTypes, BorderStyle, ExtendedTemplate } from '../extended_template';
import { BorderForm } from '../border_form';
import { AppearanceForm } from '../appearance_form';

const defaultValues: Arguments = {
  padding: 0,
  opacity: 1,
  overflow: 'visible',
  borderRadius: 0,
  borderStyle: BorderStyle.SOLID,
  borderWidth: 1,
  border: '1px solid #fff',
};

class Interactive extends React.Component<{}, Arguments> {
  public state = defaultValues;

  _getArgValue: <T extends keyof Arguments>(arg: T) => Arguments[T] = arg => {
    return this.state[arg];
  };

  _setArgValue: <T extends keyof ArgumentTypes>(arg: T, val: ArgumentTypes[T]) => void = (
    arg,
    val
  ) => {
    action('setArgValue')(arg, val);
    this.setState({ ...this.state, [arg]: val });
  };

  public render() {
    return (
      <ExtendedTemplate
        getArgValue={this._getArgValue}
        setArgValue={this._setArgValue}
        workpad={getDefaultWorkpad()}
      />
    );
  }
}

const getArgValue: <T extends keyof Arguments>(arg: T) => Arguments[T] = arg => {
  return defaultValues[arg];
};

storiesOf('arguments/ContainerStyle', module)
  .addDecorator(story => (
    <div style={{ width: '323px', padding: '16px', background: '#fff' }}>{story()}</div>
  ))
  .add('extended', () => <Interactive />);

storiesOf('arguments/ContainerStyle/components', module)
  .addDecorator(story => (
    <div style={{ width: '323px', padding: '16px', background: '#fff' }}>{story()}</div>
  ))
  .add('appearance form', () => (
    <AppearanceForm onChange={action('onChange')} padding="4" opacity="1" overflow="visible" />
  ))
  .add('border form', () => (
    <BorderForm
      onChange={action('onChange')}
      colors={getDefaultWorkpad().colors}
      value="1px dotted #000"
      radius="1"
    />
  ))
  .add('extended template', () => (
    <ExtendedTemplate
      getArgValue={getArgValue}
      setArgValue={action('setArgValue')}
      workpad={getDefaultWorkpad()}
    />
  ));
