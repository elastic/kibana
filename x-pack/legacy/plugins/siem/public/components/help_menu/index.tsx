/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { render, unmountComponentAtNode } from 'react-dom';
import React, { useEffect } from 'react';
import { pure } from 'recompose';
import chrome from 'ui/chrome';

import { HelpMenuComponent } from './help_menu';

export const HelpMenu = pure<{}>(() => {
  useEffect(() => {
    chrome.helpExtension.set(domNode => {
      render(<HelpMenuComponent />, domNode);
      return () => {
        unmountComponentAtNode(domNode);
      };
    });
  }, []);

  return null;
});
