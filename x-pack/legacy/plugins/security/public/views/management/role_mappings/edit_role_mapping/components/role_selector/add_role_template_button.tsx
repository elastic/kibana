/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import {
  EuiButtonEmpty,
  EuiCallOut,
  EuiPopover,
  EuiContextMenu,
  EuiContextMenuPanelDescriptor,
  EuiContextMenuPanelItemDescriptor,
} from '@elastic/eui';

interface Props {
  canUseStoredScripts: boolean;
  canUseInlineScripts: boolean;
  onClick: (templateType: 'inline' | 'stored') => void;
}

export const AddRoleTemplateButton = (props: Props) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  if (!props.canUseStoredScripts && !props.canUseInlineScripts) {
    return (
      <EuiCallOut iconType="alert" color="danger" title={'Role templates unavailable'}>
        <p>Role templates cannot be used when scripts are disabled in Elasticsearch</p>
      </EuiCallOut>
    );
  }

  if (!props.canUseStoredScripts) {
    return (
      <EuiButtonEmpty iconType="plusInCircle" onClick={() => props.onClick('inline')}>
        Add role template
      </EuiButtonEmpty>
    );
  }

  if (!props.canUseInlineScripts) {
    return (
      <EuiButtonEmpty iconType="plusInCircle" onClick={() => props.onClick('stored')}>
        Add role template
      </EuiButtonEmpty>
    );
  }

  const button = (
    <EuiButtonEmpty
      iconType="plusInCircle"
      onClick={() => {
        setIsMenuOpen(!isMenuOpen);
      }}
    >
      Add role template
    </EuiButtonEmpty>
  );

  const options: EuiContextMenuPanelItemDescriptor[] = [
    {
      name: 'New template',
      icon: 'editorCodeBlock',
      onClick: () => {
        setIsMenuOpen(false);
        props.onClick('inline');
      },
    },
    {
      name: 'Stored script',
      icon: 'database',
      onClick: () => {
        setIsMenuOpen(false);
        props.onClick('stored');
      },
    },
  ];

  const panels: EuiContextMenuPanelDescriptor[] = [
    {
      id: 0,
      title: 'Add role template',
      items: options,
    },
  ];

  return (
    <EuiPopover
      id="addRoleTemplateContextMenu"
      button={button}
      isOpen={isMenuOpen}
      closePopover={() => setIsMenuOpen(false)}
      panelPaddingSize="none"
      withTitle
      anchorPosition="downLeft"
    >
      <EuiContextMenu title="Add role template" initialPanelId={0} panels={panels} />
    </EuiPopover>
  );
};
