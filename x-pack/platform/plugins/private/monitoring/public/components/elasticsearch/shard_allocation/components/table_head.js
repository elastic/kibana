/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFlexGroup, EuiFlexItem, EuiSwitch } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

class IndexLabel extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      showSystemIndices: props.showSystemIndices,
    };
    this.toggleShowSystemIndicesState = this.toggleShowSystemIndicesState.bind(this);
  }

  toggleShowSystemIndicesState(e) {
    const isChecked = e.target.checked;
    this.setState({ showSystemIndices: isChecked });
    this.props.toggleShowSystemIndices(isChecked);
  }

  render() {
    return (
      <EuiFlexGroup>
        <EuiFlexItem grow={false}>
          <FormattedMessage
            id="xpack.monitoring.elasticsearch.shardAllocation.tableHead.indicesLabel"
            defaultMessage="Indices"
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiSwitch
            label={i18n.translate(
              'xpack.monitoring.elasticsearch.shardAllocation.tableHead.filterSystemIndices',
              {
                defaultMessage: 'Filter for system indices',
              }
            )}
            onChange={this.toggleShowSystemIndicesState}
            checked={this.state.showSystemIndices}
            data-test-subj="shardShowSystemIndices"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
}

// eslint-disable-next-line react/no-multi-comp
export class TableHead extends React.Component {
  constructor(props) {
    super(props);
  }

  createColumn({ key, content }) {
    return (
      <th scope="col" key={key} colSpan={1}>
        {content}
      </th>
    );
  }

  render() {
    const propLabels = this.props.labels || [];
    const labelColumns = propLabels
      .map((label) => {
        const column = {
          key: label.content.toLowerCase(),
        };

        if (label.showToggleSystemIndicesComponent) {
          // override text label content with a JSX component
          column.content = (
            <IndexLabel
              toggleShowSystemIndices={this.props.toggleShowSystemIndices}
              showSystemIndices={this.props.showSystemIndices}
            />
          );
        } else {
          column.content = label.content;
        }

        return column;
      })
      .map(this.createColumn);

    return (
      <thead>
        <tr>{labelColumns}</tr>
      </thead>
    );
  }
}
