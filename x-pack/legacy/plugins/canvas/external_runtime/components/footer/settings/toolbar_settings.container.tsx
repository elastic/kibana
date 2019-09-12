/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { useExternalEmbedState, setToolbarAutohideAction } from '../../../context';
import { ToolbarSettings as ToolbarSettingsComponent, onSetAutohideProp } from './toolbar_settings';

interface Props {
  onSetAutohide?: onSetAutohideProp;
}

/**
 * The settings panel for the Toolbar of an Embedded Workpad.
 */
export const ToolbarSettings = ({ onSetAutohide = () => {} }: Props) => {
  const [{ settings }, dispatch] = useExternalEmbedState();

  const { toolbar } = settings;
  const { isAutohide } = toolbar;

  const onSetAutohideFn: onSetAutohideProp = (autohide: boolean) => {
    onSetAutohide(autohide);
    dispatch(setToolbarAutohideAction(autohide));
  };

  return <ToolbarSettingsComponent onSetAutohide={onSetAutohideFn} {...{ isAutohide }} />;
};
