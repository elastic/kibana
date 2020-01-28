/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import ReactDOM from 'react-dom';
import React from 'react';

import { RendererFactory, Datatable } from '../../../types';
import { RendererStrings } from '../../../i18n';
import { Csv } from './component';

const { csv: strings } = RendererStrings;

interface Config {
  datatable: Datatable;
}

export const csv: RendererFactory<Config> = () => ({
  name: 'csv',
  displayName: strings.getDisplayName(),
  help: strings.getHelpDescription(),
  reuseDomNode: true,
  render(domNode, config, handlers) {
    const { datatable } = config;

    if (!datatable) {
      return;
    }

    const { offsetHeight: height, offsetWidth: width } = domNode;

    const renderCSV = () => <Csv {...{ datatable, height, width }} />;

    ReactDOM.render(renderCSV(), domNode, () => handlers.done());

    handlers.onResize(() => {
      ReactDOM.render(renderCSV(), domNode, () => handlers.done());
    });

    handlers.onDestroy(() => ReactDOM.unmountComponentAtNode(domNode));
  },
});
