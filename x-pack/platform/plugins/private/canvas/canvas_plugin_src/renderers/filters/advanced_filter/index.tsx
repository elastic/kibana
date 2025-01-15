/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import { StartInitializer } from '../../../plugin';
import { RendererFactory } from '../../../../types';
import { AdvancedFilter } from './component';
import { RendererStrings } from '../../../../i18n';

const { advancedFilter: strings } = RendererStrings;

export const advancedFilterFactory: StartInitializer<RendererFactory<{}>> =
  (core, _plugins) => () => ({
    name: 'advanced_filter',
    displayName: strings.getDisplayName(),
    help: strings.getHelpDescription(),
    reuseDomNode: true,
    height: 50,
    render(domNode, _, handlers) {
      ReactDOM.render(
        <KibanaRenderContextProvider {...core}>
          <AdvancedFilter
            commit={(filter) => handlers.event({ name: 'applyFilterAction', data: filter })}
            value={handlers.getFilter()}
          />
        </KibanaRenderContextProvider>,
        domNode,
        () => handlers.done()
      );

      handlers.onDestroy(() => {
        ReactDOM.unmountComponentAtNode(domNode);
      });
    },
  });
