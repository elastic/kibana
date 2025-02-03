/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import ReactDOM from 'react-dom';
import React from 'react';
import { CoreStart } from '@kbn/core/public';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import { StartInitializer } from '../plugin';
import { Datatable as DatatableComponent } from '../../public/components/datatable';
import { RendererStrings } from '../../i18n';
import { RendererFactory, Style, Datatable } from '../../types';

const { dropdownFilter: strings } = RendererStrings;
export interface TableArguments {
  font?: Style;
  paginate: boolean;
  perPage: number;
  showHeader: boolean;
  datatable: Datatable;
}

export const getTableRenderer =
  (core: CoreStart): RendererFactory<TableArguments> =>
  () => ({
    name: 'table',
    displayName: strings.getDisplayName(),
    help: strings.getHelpDescription(),
    reuseDomNode: true,
    render(domNode, config, handlers) {
      const { datatable, paginate, perPage, font = { spec: {} }, showHeader } = config;
      ReactDOM.render(
        <KibanaRenderContextProvider {...core}>
          <div style={{ ...(font.spec as React.CSSProperties), height: '100%' }}>
            <DatatableComponent
              datatable={datatable}
              perPage={perPage}
              paginate={paginate}
              showHeader={showHeader}
            />
          </div>
        </KibanaRenderContextProvider>,
        domNode,
        () => handlers.done()
      );
      handlers.onDestroy(() => ReactDOM.unmountComponentAtNode(domNode));
    },
  });

export const tableFactory: StartInitializer<RendererFactory<TableArguments>> = (core, _plugins) =>
  getTableRenderer(core);
