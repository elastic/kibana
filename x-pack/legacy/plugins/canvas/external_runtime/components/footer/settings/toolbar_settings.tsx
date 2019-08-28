/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiSwitch, EuiFormRow } from '@elastic/eui';
import { useExternalEmbedState, setToolbarAutohide } from '../../../context';

// @ts-ignore CSS Module
import css from './settings.module';

interface Props {
  onChange?: () => void;
}

/**
 * The settings panel for the Toolbar of an Embedded Workpad.
 */
export const ToolbarSettings = ({ onChange = () => {} }: Props) => {
  const [{ settings }, dispatch] = useExternalEmbedState();

  const { toolbar } = settings;

  return (
    <div style={{ padding: 16 }}>
      <EuiFormRow helpText="Hide the toolbar when the mouse is not within the Canvas?">
        <EuiSwitch
          name="toolbarHide"
          id="toolbarHide"
          label="Hide Toolbar"
          checked={toolbar.autohide}
          onChange={() => {
            onChange();
            dispatch(setToolbarAutohide(!toolbar.autohide));
          }}
        />
      </EuiFormRow>
    </div>
  );
};
