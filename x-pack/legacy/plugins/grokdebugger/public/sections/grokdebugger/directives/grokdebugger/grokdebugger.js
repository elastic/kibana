/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { uiModules } from 'ui/modules';
import 'plugins/grokdebugger/services/grokdebugger';
import { GrokDebugger } from '../../components/grok_debugger';
import { render } from 'react-dom';
import React from 'react';
import { I18nContext } from 'ui/i18n';

const app = uiModules.get('xpack/grokdebugger');

app.directive('grokdebugger', function($injector) {
  const grokdebuggerService = $injector.get('grokdebuggerService');

  return {
    restrict: 'E',
    link: (scope, el) => {
      render(
        <I18nContext>
          <GrokDebugger grokdebuggerService={grokdebuggerService} />
        </I18nContext>,
        el[0]
      );
    },
  };
});
