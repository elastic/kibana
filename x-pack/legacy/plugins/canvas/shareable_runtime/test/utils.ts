/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ReactWrapper } from 'enzyme';
import { Component } from 'react';
import { setTimeout } from 'timers';

export const tick = (ms = 0) =>
  new Promise(resolve => {
    setTimeout(resolve, ms);
  });

export const takeMountedSnapshot = (mountedComponent: ReactWrapper<{}, {}, Component>) => {
  const html = mountedComponent.html();
  const template = document.createElement('template');
  template.innerHTML = html;
  return template.content.firstChild;
};
