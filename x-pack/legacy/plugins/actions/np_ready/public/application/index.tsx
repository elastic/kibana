/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render } from 'react-dom';
import { I18nContext } from 'ui/i18n';
import { HttpServiceBase } from 'kibana/public';
import { App } from './app';

export const renderReact = async (element: any, http: HttpServiceBase) => {
  render(
    <I18nContext>
      <App api={{ http }} />
    </I18nContext>,
    element
  );
};
