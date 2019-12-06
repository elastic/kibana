/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { EuiButtonEmpty, EuiPopover, EuiContextMenuPanel, EuiContextMenuItem } from '@elastic/eui';
import { Rule, FieldRule, AllRule } from '../../../model';

interface Props {
  autoAdd?: boolean;
  onClick: (newRule: Rule) => void;
}

export const AddRuleButton = (props: Props) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const button = (
    <EuiButtonEmpty
      iconType="plusInCircle"
      onClick={() => {
        if (props.autoAdd) {
          props.onClick(new AllRule([new FieldRule('username', '*')]));
        } else {
          setIsMenuOpen(!isMenuOpen);
        }
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
        props.onClick(new FieldRule('username', '*'));
      }}
    >
      Add Rule
    </EuiContextMenuItem>,
    <EuiContextMenuItem
      key="ruleGroup"
      name="Add rule group"
      icon="partial"
      onClick={() => {
        setIsMenuOpen(false);
        props.onClick(new AllRule([new FieldRule('username', '*')]));
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
