/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { HelpMenu } from './components/help_menu';

export function addHelpMenuToAppChrome(chrome) {
  chrome.helpExtension.set(domElement => {
    render(<HelpMenu />, domElement);
    return () => {
      unmountComponentAtNode(domElement);
    };
  });
}
