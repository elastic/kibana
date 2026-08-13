/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Component, Fragment } from 'react';
import _ from 'lodash';
import { EuiText, EuiLink, useEuiTheme } from '@elastic/eui';
import classNames from 'classnames';
import type { Attribution } from '../../../../common/descriptor_types';
import type { ILayer } from '../../../classes/layers/layer';
import { isScreenshotMode } from '../../../kibana_services';

export interface Props {
  isFullScreen: boolean;
  layerList: ILayer[];
}

interface State {
  uniqueAttributions: Attribution[];
}

/**
 * Reactive wrapper for the attribution overlay. Reads the color mode through
 * `useEuiTheme` so the background follows reload-less light/dark theme switches
 * (static SCSS colors do not update without a page reload).
 */
function AttributionContainer({
  isFullScreen,
  children,
}: {
  isFullScreen: boolean;
  children: React.ReactNode;
}) {
  const { euiTheme } = useEuiTheme();
  return (
    <div
      className={classNames('mapAttributionControl', {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        mapAttributionControl__fullScreen: isFullScreen,
      })}
      css={{ backgroundColor: euiTheme.colors.body }}
    >
      <EuiText size="xs">
        <small>{children}</small>
      </EuiText>
    </div>
  );
}

export class AttributionControl extends Component<Props, State> {
  private _isMounted = false;
  state = {
    uniqueAttributions: [],
  };

  componentDidMount() {
    this._isMounted = true;
    this._loadAttributions();
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  componentDidUpdate() {
    this._loadAttributions();
  }

  _loadAttributions = async () => {
    const attributionPromises = this.props.layerList.map(async (layer) => {
      try {
        return await layer.getAttributions();
      } catch (error) {
        return [];
      }
    });
    const attributions = await Promise.all(attributionPromises);
    if (!this._isMounted) {
      return;
    }

    const uniqueAttributions: Attribution[] = [];
    for (let i = 0; i < attributions.length; i++) {
      for (let j = 0; j < attributions[i].length; j++) {
        const testAttr = attributions[i][j];
        const attr = uniqueAttributions.find((added) => {
          return added.url === testAttr.url && added.label === testAttr.label;
        });
        if (!attr) {
          uniqueAttributions.push(testAttr);
        }
      }
    }

    // Reflect top-to-bottom layer order as left-to-right in attribs
    uniqueAttributions.reverse();
    if (!_.isEqual(this.state.uniqueAttributions, uniqueAttributions)) {
      this.setState({ uniqueAttributions });
    }
  };

  _renderAttribution({ url, label }: Attribution) {
    return !url || isScreenshotMode() ? (
      label
    ) : (
      <EuiLink color="text" href={url} target="_blank">
        {label}
      </EuiLink>
    );
  }

  _renderAttributions() {
    return this.state.uniqueAttributions.map((attribution, index) => {
      return (
        <Fragment key={index}>
          {this._renderAttribution(attribution)}
          {index < this.state.uniqueAttributions.length - 1 && ', '}
        </Fragment>
      );
    });
  }

  render() {
    if (this.state.uniqueAttributions.length === 0) {
      return null;
    }
    return (
      <AttributionContainer isFullScreen={this.props.isFullScreen}>
        {this._renderAttributions()}
      </AttributionContainer>
    );
  }
}
