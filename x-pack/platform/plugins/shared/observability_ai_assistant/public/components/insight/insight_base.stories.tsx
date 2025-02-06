/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ComponentStory } from '@storybook/react';

import { FindActionResult } from '@kbn/actions-plugin/server';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { InsightBase as Component, InsightBaseProps } from './insight_base';
import { KibanaReactStorybookDecorator } from '../../utils/storybook_decorator';
import { MessagePanel } from '../message_panel/message_panel';
import { MessageText } from '../message_panel/message_text';
import { FeedbackButtons } from '../buttons/feedback_buttons';
import { RegenerateResponseButton } from '../buttons/regenerate_response_button';
import { StartChatButton } from '../buttons/start_chat_button';
import { ActionsMenu } from './actions_menu';

export default {
  component: Component,
  title: 'app/Molecules/Insight',
  decorators: [KibanaReactStorybookDecorator],
};

const Template: ComponentStory<typeof Component> = (props: InsightBaseProps) => (
  <Component {...props} />
);

const defaultProps: InsightBaseProps = {
  title: 'What is the root cause of performance degradation in my service?',
  actions: [
    { id: 'foo', label: 'Put hands in pockets', handler: () => {} },
    { id: 'bar', label: 'Drop kick', handler: () => {} },
  ],
  loading: false,
  controls: (
    <ActionsMenu
      connectors={{
        connectors: [
          { id: 'gpt-4', name: 'GPT-4' },
          { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' },
        ] as FindActionResult[],
        selectedConnector: 'gpt-4',
        loading: false,
        selectConnector: () => {},
        reloadConnectors: () => {},
      }}
      onEditPrompt={() => {}}
    />
  ),
  onToggle: () => {},
  children: (
    <MessagePanel
      body={
        <MessageText
          content={`Lorem ipsum dolor sit amet, consectetur adipiscing elit. 

Aliquam commodo sollicitudin erat in ultrices. Vestibulum euismod ex ac lectus semper hendrerit. 

Morbi mattis odio justo, in ullamcorper metus aliquet eu. Praesent risus velit, rutrum ac magna non, vehicula vestibulum sapien. Quisque pulvinar eros eu finibus iaculis. 

Morbi dapibus sapien lacus, vitae suscipit ex egestas pharetra. In velit eros, fermentum sit amet augue ut, aliquam sodales nulla. Nunc mattis lobortis eros sit amet dapibus. 

Morbi non faucibus massa. Aliquam sed augue in eros ornare luctus sit amet cursus dolor. Pellentesque pellentesque lorem eu odio auctor convallis. Sed sodales felis at velit tempus tincidunt. Nulla sed ante cursus nibh mollis blandit. In mattis imperdiet tellus. Vestibulum nisl turpis, efficitur quis sollicitudin id, mollis in arcu. Vestibulum pulvinar tincidunt magna, vitae facilisis massa congue quis. Cras commodo efficitur tellus, et commodo risus rutrum at.`}
          loading={false}
          onActionClick={async () => {}}
        />
      }
      controls={
        <EuiFlexGroup>
          <EuiFlexItem grow>
            <FeedbackButtons onClickFeedback={() => {}} />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup direction="row" gutterSize="s">
              <EuiFlexItem grow={false}>
                <RegenerateResponseButton />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <StartChatButton />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      }
    />
  ),
  isOpen: false,
};

export const Insight = Template.bind({});
Insight.args = defaultProps;
