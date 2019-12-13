/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { action } from '@storybook/addon-actions';
import { storiesOf } from '@storybook/react';
import React from 'react';
import { ColorManager } from '../color_manager';

class Interactive extends React.Component<{}, { hasButtons: boolean; value: string }> {
  public state = {
    hasButtons: true,
    value: '',
  };

  public render() {
    return (
      <div>
        <ColorManager
          hasButtons={this.state.hasButtons}
          onAddColor={action('onAddColor')}
          onRemoveColor={action('onRemoveColor')}
          onChange={value => this.setState({ value })}
          value={this.state.value}
        />
        <p style={{ marginTop: 20 }}>
          <label>
            <input
              aria-checked={this.state.hasButtons}
              type="checkbox"
              checked={this.state.hasButtons}
              onChange={() => this.setState({ hasButtons: !this.state.hasButtons })}
            />
            {'  '}
            <span>Show Buttons?</span>
          </label>
        </p>
      </div>
    );
  }
}

storiesOf('components/Color/ColorManager', module)
  .addParameters({
    info: {
      inline: true,
      styles: {
        infoBody: {
          margin: 20,
        },
        infoStory: {
          margin: '40px 60px',
          width: '320px',
        },
      },
    },
  })
  .add('default', () => (
    <>
      <ColorManager key="1" onChange={action('onChange')} value="blue" />
      <ColorManager key="2" onChange={action('onChange')} value="#abc" />
      <ColorManager key="3" onChange={action('onChange')} value="#abcd" />
      <ColorManager key="4" onChange={action('onChange')} value="#abcdef" />
      <ColorManager key="5" onChange={action('onChange')} value="#aabbccdd" />
      <ColorManager key="6" onChange={action('onChange')} value="rgb(50, 100, 150)" />
      <ColorManager key="7" onChange={action('onChange')} value="rgba(50, 100, 150, .5)" />
    </>
  ))
  .add('invalid colors', () => (
    <>
      <ColorManager key="1" onChange={action('onChange')} value="elastic" />
      <ColorManager key="2" onChange={action('onChange')} value="#xyz" />
      <ColorManager key="3" onChange={action('onChange')} value="#ghij" />
      <ColorManager key="4" onChange={action('onChange')} value="#canvas" />
      <ColorManager key="5" onChange={action('onChange')} value="#12345xyz" />
      <ColorManager key="6" onChange={action('onChange')} value="rgb(a,b,c)" />
      <ColorManager key="7" onChange={action('onChange')} value="rgba(w,x,y,z)" />
    </>
  ))
  .add('with buttons', () => (
    <>
      <ColorManager
        hasButtons={true}
        key="1"
        onAddColor={action('onAddColor')}
        onChange={action('onChange')}
        value="#abcdef"
      />
      <ColorManager
        hasButtons={true}
        key="2"
        onChange={action('onChange')}
        onRemoveColor={action('onRemoveColor')}
        value="#abcdef"
      />
      <ColorManager
        hasButtons={true}
        key="3"
        onAddColor={action('onAddColor')}
        onChange={action('onChange')}
        onRemoveColor={action('onRemoveColor')}
        value="#abcdef"
      />
    </>
  ))
  .add('interactive', () => <Interactive />, {
    info: {
      inline: true,
      source: false,
      propTablesExclude: [Interactive],
      styles: {
        infoBody: {
          margin: 20,
        },
        infoStory: {
          margin: '40px 60px',
          width: '320px',
        },
      },
    },
  });
