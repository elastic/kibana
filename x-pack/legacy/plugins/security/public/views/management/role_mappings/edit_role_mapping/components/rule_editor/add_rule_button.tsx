/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, ReactChild } from 'react';
import {
  EuiButtonEmpty,
  EuiPopover,
  EuiContextMenu,
  EuiContextMenuPanelDescriptor,
  EuiContextMenuPanelItemDescriptor,
} from '@elastic/eui';
import { RoleMappingRule } from '../../../../../../../common/model';

interface Props {
  onClick: (newRule: RoleMappingRule) => void;
  children?: ReactChild;
  allowExceptRule?: boolean;
}

const defaultValues = {
  field: () => ({ field: { username: '*' } }),
  any: () => ({ any: [] }),
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
      {props.children || 'Add rule'}
    </EuiButtonEmpty>
  );

  const options: EuiContextMenuPanelItemDescriptor[] = [
    {
      name: 'User field matches value',
      icon: 'user',
      onClick: () => {
        setIsMenuOpen(false);
        props.onClick(defaultValues.field());
      },
    },
    {
      name: 'Group: any of the following rules',
      icon: 'partial',
      onClick: () => {
        setIsMenuOpen(false);
        props.onClick(defaultValues.any());
      },
    },
    {
      name: 'Group: all of the following rules',
      icon: 'asterisk',
      onClick: () => {
        setIsMenuOpen(false);
        props.onClick(defaultValues.all());
      },
    },
  ];

  const panels: EuiContextMenuPanelDescriptor[] = [
    {
      id: 0,
      title: 'Add rule',
      items: options,
    },
  ];

  if (props.allowExceptRule) {
    options.splice(1, 0, {
      name: 'except',
      icon: 'crossInACircleFilled',
      panel: 1,
    });
    panels.push({
      id: 1,
      title: 'Add rule exception',
      items: [
        {
          name: 'field',
          icon: 'user',
          onClick: () => {
            setIsMenuOpen(false);
            props.onClick({ except: defaultValues.field() });
          },
        },
        {
          name: 'any',
          icon: 'partial',
          onClick: () => {
            setIsMenuOpen(false);
            props.onClick({ except: defaultValues.any() });
          },
        },
        {
          name: 'all',
          icon: 'asterisk',
          onClick: () => {
            setIsMenuOpen(false);
            props.onClick({ except: defaultValues.all() });
          },
        },
      ],
    });
  }

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
      <EuiContextMenu title="Add rule" initialPanelId={0} panels={panels} />
    </EuiPopover>
  );
};
