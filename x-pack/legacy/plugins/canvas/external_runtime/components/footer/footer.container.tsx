/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { useExternalEmbedState, setScrubberVisibleAction } from '../../context';
import { Footer as FooterComponent } from './footer';
export { FOOTER_HEIGHT } from './footer';

interface Props {
  isHidden?: boolean;
}

/**
 * The footer of the Embedded Workpad.
 */
export const Footer = ({ isHidden = false }: Props) => {
  const [{ workpad, settings, footer }, dispatch] = useExternalEmbedState();

  if (!workpad) {
    return null;
  }

  const { toolbar } = settings;
  const { isAutohide } = toolbar;
  const { isScrubberVisible } = footer;

  // If autohide is enabled, and the toolbar is hidden, set the scrubber
  // visibility to hidden.  This is useful for state changes where one
  // sets the footer to hidden, and the scrubber would be left open with
  // no toolbar.
  if (isAutohide && isHidden && isScrubberVisible) {
    dispatch(setScrubberVisibleAction(false));
  }

  return <FooterComponent {...{ isHidden, isAutohide }} />;
};
