/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import ReactDOM from 'react-dom';
import React from 'react';
import { elasticLogo } from '../lib/elastic_logo';
import { isValidUrl } from '../../common/lib/url';
import { RendererStrings } from '../../i18n';

const { image: strings } = RendererStrings;

export const image = () => ({
  name: 'image',
  displayName: strings.getDisplayName(),
  help: strings.getHelpDescription(),
  reuseDomNode: true,
  render(domNode, config, handlers) {
    const dataurl = isValidUrl(config.dataurl) ? config.dataurl : elasticLogo;

    const style = {
      height: '100%',
      backgroundImage: `url(${dataurl})`,
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'center center',
      backgroundSize: config.mode,
    };

    ReactDOM.render(<div style={style} />, domNode, () => handlers.done());

    handlers.onDestroy(() => ReactDOM.unmountComponentAtNode(domNode));
  },
});
