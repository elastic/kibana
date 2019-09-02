/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFieldSearch,
  EuiToolTip,
  EuiButtonEmpty,
  EuiBadge,
  EuiPopover,
  EuiFormRow,
  EuiButton,
  EuiComboBox,
  EuiColorPicker,
  EuiFieldNumber,
  EuiText,
} from '@elastic/eui';
import { iconChoices } from '../services/style_choices';
import { LegacyIcon } from './graph_settings/legacy_icon';

function IndexPatternSwitch() {
  return (
    <EuiFlexGroup alignItems="center" gutterSize="xs">
      <EuiFlexItem>
        <EuiText size="s">kibana_sample_data_logs</EuiText>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiToolTip content="Changing the index pattern clears all data.">
          <EuiButtonEmpty size="xs">(change)</EuiButtonEmpty>
        </EuiToolTip>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

function SearchBar() {
  return (
    <EuiFlexGroup alignItems="center" gutterSize="xs">
      <EuiFlexItem>
        <EuiFieldSearch fullWidth placeholder="Search to explore more vertices" value="" />
      </EuiFlexItem>
      <EuiFlexItem grow={null}>
        <EuiButton fill>Explore</EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

function VertexManager() {
  const [open, setOpen] = useState(false);
  return (
    <EuiFlexGroup gutterSize="s" alignItems="center">
      <EuiFlexItem grow={null}>
        <EuiPopover
          id="popover"
          isOpen={open}
          closePopover={() => setOpen(false)}
          anchorPosition="downLeft"
          button={
            <EuiBadge
              iconOnClick={() => setOpen(!open)}
              iconOnClickAriaLabel=""
              iconType="flag"
              color="primary"
            >
              category.keyword
            </EuiBadge>
          }
        >
          <EuiFormRow label="Field">
            <EuiComboBox selectedOptions={[{ label: 'category.keyword' }]} />
          </EuiFormRow>

          <EuiFormRow label="Color">
            <EuiColorPicker color="#ffffff" onChange={() => {}} />
          </EuiFormRow>

          <EuiFormRow label="Icon">
            <div>
              {iconChoices.map(icon => (
                <LegacyIcon key={icon.class} asListIcon icon={icon} onClick={() => {}} />
              ))}
            </div>
          </EuiFormRow>

          <EuiFormRow label="Max hops">
            <EuiFieldNumber />
          </EuiFormRow>

          <EuiButton fill>Save</EuiButton>
        </EuiPopover>
      </EuiFlexItem>
      <EuiFlexItem grow={null}>
        <EuiBadge color="secondary" iconType="globe">
          city.keyword
        </EuiBadge>
      </EuiFlexItem>
      <EuiFlexItem grow={null}>
        <EuiButtonEmpty size="xs">+ Add vertex type</EuiButtonEmpty>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

export function GraphBar() {
  return (
    <EuiFlexGroup direction="column" style={{ padding: 10 }} gutterSize="s">
      <EuiFlexItem>
        <EuiFlexGroup gutterSize="s">
          <EuiFlexItem grow={null}>
            <IndexPatternSwitch />
          </EuiFlexItem>
          <EuiFlexItem>
            <SearchBar />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem>
        <VertexManager />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
