/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { calculateClass } from '../lib/calculate_class';
import { vents } from '../lib/vents';
import { i18n } from '@kbn/i18n';
import { EuiToolTip, EuiBadge } from '@elastic/eui';

function getColor(classes) {
  const classList = classes.split(' ');

  if (classList.includes('emergency')) {
    return 'danger';
  }

  if (classList.includes('unassigned')) {
    if (classList.includes('replica')) {
      return 'warning';
    }
    return 'danger';
  }

  if (classList.includes('relocating')) {
    return 'accent';
  }

  if (classList.includes('initializing')) {
    return 'default';
  }

  if (classList.includes('primary')) {
    return 'primary';
  }

  if (classList.includes('replica')) {
    return 'secondary';
  }
}

export class Shard extends React.Component {
  static displayName = i18n.translate(
    'xpack.monitoring.elasticsearch.shardAllocation.shardDisplayName',
    {
      defaultMessage: 'Shard',
    }
  );
  state = { tooltipVisible: false };

  componentDidMount() {
    let key;
    const shard = this.props.shard;
    const self = this;
    if (shard.tooltip_message) {
      key = this.generateKey();
      vents.on(key, function(action) {
        self.setState({ tooltipVisible: action === 'show' });
      });
    }
  }

  generateKey = relocating => {
    const shard = this.props.shard;
    const shardType = shard.primary ? 'primary' : 'replica';
    const additionId = shard.state === 'UNASSIGNED' ? Math.random() : '';
    const node = relocating ? shard.relocating_node : shard.node;
    return shard.index + '.' + node + '.' + shardType + '.' + shard.shard + additionId;
  };

  componentWillUnmount() {
    let key;
    const shard = this.props.shard;
    if (shard.tooltip_message) {
      key = this.generateKey();
      vents.clear(key);
    }
  }

  toggle = event => {
    if (this.props.shard.tooltip_message) {
      const action = event.type === 'mouseenter' ? 'show' : 'hide';
      const key = this.generateKey(true);
      this.setState({ tooltipVisible: action === 'show' });
      vents.trigger(key, action);
    }
  };

  render() {
    const shard = this.props.shard;
    const classes = calculateClass(shard);
    const color = getColor(classes);
    const classification = classes + ' ' + shard.shard;

    let shardUi = <EuiBadge color={color}>{shard.shard}</EuiBadge>;

    if (this.state.tooltipVisible) {
      shardUi = (
        <EuiToolTip
          content={this.props.shard.tooltip_message}
          position="bottom"
          data-test-subj="shardTooltip"
        >
          <p>{shardUi}</p>
        </EuiToolTip>
      );
    }

    // data attrs for automated testing verification
    return (
      <div
        onMouseEnter={this.toggle}
        onMouseLeave={this.toggle}
        className={classes}
        data-shard-tooltip={this.props.shard.tooltip_message}
        data-shard-classification={classification}
        data-test-subj="shardIcon"
      >
        {shardUi}
      </div>
    );
  }
}
