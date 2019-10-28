/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React, { Component } from 'react';
import {
  setup as navSetup,
  start as navStart,
} from '../../../../../src/legacy/core_plugins/navigation/public/legacy';

const customExtension = {
  id: 'registered-prop',
  label: 'Registered Button',
  description: 'Registered Demo',
  run() {},
  testId: 'demoRegisteredNewButton',
};

navSetup.registerMenuItem(customExtension);

export class AppWithTopNav extends Component {
  public render() {
    const { TopNavMenu } = navStart.ui;
    const config = [
      {
        id: 'new',
        label: 'New Button',
        description: 'New Demo',
        run() {},
        testId: 'demoNewButton',
      },
    ];
    return (
      <TopNavMenu appName="demo-app" config={config}>
        Hey
      </TopNavMenu>
    );
  }
}
