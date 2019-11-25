/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { EuiButtonEmpty, EuiPopover, EuiContextMenuPanel, EuiContextMenuItem } from '@elastic/eui';
import { RoleMappingRule } from '../../../../../../../common/model';

interface Props {
  onClick: (newRule: RoleMappingRule) => void;
}

const defaultValues = {
  field: () => ({ field: { username: '*' } }),
  all: () => ({ all: [] }),
};

export const AddRuleButton = (props: Props) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const button = (
    <EuiButtonEmpty
      iconType="plusInCircle"
      onClick={() => {
        setIsMenuOpen(!isMenuOpen);
      }}
    >
      Add
    </EuiButtonEmpty>
  );

  const options = [
    <EuiContextMenuItem
      key="rule"
      name="Add rule"
      icon="user"
      onClick={() => {
        setIsMenuOpen(false);
        props.onClick(defaultValues.field());
      }}
    >
      Add Rule
    </EuiContextMenuItem>,
    <EuiContextMenuItem
      key="rule"
      name="Add rule group"
      icon="partial"
      onClick={() => {
        setIsMenuOpen(false);
        props.onClick(defaultValues.all());
      }}
    >
      Add rule group
    </EuiContextMenuItem>,
  ];

  return (
    <EuiPopover
      id="addRuleContextMenu"
      button={button}
      isOpen={isMenuOpen}
      closePopover={() => setIsMenuOpen(false)}
      panelPaddingSize="none"
      withTitle
      anchorPosition="downLeft"
    >
      <EuiContextMenuPanel title="Add rule" items={options} />
    </EuiPopover>
  );
};
