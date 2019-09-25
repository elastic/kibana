/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { useCanvasShareableState, setToolbarAutohideAction } from '../../../context';
import {
  ToolbarSettings,
  Props as ToolbarSettingsProps,
  onSetAutohideProp,
} from './toolbar_settings';

type Props = Pick<ToolbarSettingsProps, 'onSetAutohide'>;

/**
 * A store-connected container for the `ToolbarSettings` component.
 */
export const ToolbarSettingsContainer = ({ onSetAutohide }: Props) => {
  const [{ settings }, dispatch] = useCanvasShareableState();

  const { toolbar } = settings;
  const { isAutohide } = toolbar;

  const onSetAutohideFn: onSetAutohideProp = (autohide: boolean) => {
    onSetAutohide(autohide);
    dispatch(setToolbarAutohideAction(autohide));
  };

  return <ToolbarSettings onSetAutohide={onSetAutohideFn} {...{ isAutohide }} />;
};
