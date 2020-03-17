/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { EuiCard, EuiIcon, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

const icons = ['essql', 'esdocs', 'demodata', 'timelion'];

const cardNodes = icons.map(function(item, index) {
  return (
    <EuiFlexItem key={index}>
      <EuiCard
        icon={<EuiIcon size="xxl" type={`logo${item}`} />}
        title={`Elastic ${item}`}
        isDisabled={item === 'Kibana' ? true : false}
        description="Example of a card's description. Stick to one or two sentences."
        onClick={() => window.alert('Card clicked')}
      />
    </EuiFlexItem>
  );
});

export default () => <EuiFlexGroup gutterSize="l">{cardNodes}</EuiFlexGroup>;

export const DatasourceSelector = ({ onSelect, datasources, current }) => (
  <div className="canvasDataSource__list">
    {datasources.map(d => (
      <EuiCard
        key={d.name}
        title={d.displayName}
        titleElement="h5"
        titleSize="xs"
        icon={<EuiIcon type={d.image} size="l" />}
        description={d.help}
        layout="horizontal"
        className="canvasDataSource__card"
        selectable={{
          isSelected: d.name === current ? true : false,
          onClick: () => onSelect(d.name),
        }}
      />
    ))}
  </div>
);

DatasourceSelector.propTypes = {
  onSelect: PropTypes.func.isRequired,
  datasources: PropTypes.array.isRequired,
  current: PropTypes.string.isRequired,
};
