/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import * as i18n from './translations';

const HelloWorldComponent: React.FC = () => (
  <div data-test-subj="helloWorld">{i18n.HELLO_WORLD}</div>
);

HelloWorldComponent.displayName = 'HelloWorldComponent';

export const HelloWorld = React.memo(HelloWorldComponent);
