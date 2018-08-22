/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React, { Component } from 'react';

import { EuiContextMenu } from '@elastic/eui';

import { ShareUrlContent } from './share_url_content';

interface Props {
  allowEmbed: boolean;
  objectId?: string;
  objectType: string;
  getUnhashableStates: () => object[];
}

export class ShareContextMenu extends Component<Props> {
  public render() {
    const { panels, initialPanelId } = this.getPanels();
    return <EuiContextMenu initialPanelId={initialPanelId} panels={panels} />;
  }

  private getPanels = () => {
    const panels = [];
    const menuItems = [];

    const permalinkPanel = {
      id: panels.length + 1,
      title: 'Permalink',
      content: (
        <ShareUrlContent
          objectId={this.props.objectId}
          objectType={this.props.objectType}
          getUnhashableStates={this.props.getUnhashableStates}
        />
      ),
    };
    menuItems.push({
      name: 'Permalinks',
      icon: 'link',
      panel: permalinkPanel.id,
    });
    panels.push(permalinkPanel);

    if (this.props.allowEmbed) {
      const embedPanel = {
        id: panels.length + 1,
        title: 'Embed Code',
        content: (
          <ShareUrlContent
            isEmbedded
            objectId={this.props.objectId}
            objectType={this.props.objectType}
            getUnhashableStates={this.props.getUnhashableStates}
          />
        ),
      };
      panels.push(embedPanel);
      menuItems.push({
        name: 'Embed code',
        icon: 'console',
        panel: embedPanel.id,
      });
    }

    // TODO add plugable panels here

    if (menuItems.length > 1) {
      const topLevelMenuPanel = {
        id: panels.length + 1,
        title: `Share this ${this.props.objectType}`,
        items: menuItems.sort((a, b) => {
          return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
        }),
      };
      panels.push(topLevelMenuPanel);
    }

    const lastPanelIndex = panels.length - 1;
    const initialPanelId = panels[lastPanelIndex].id;
    return { panels, initialPanelId };
  };
}
