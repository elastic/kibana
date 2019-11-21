/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import chrome from 'ui/chrome';
import { Badge } from 'ui/chrome/api/badge';
import { Breadcrumb } from 'ui/chrome/api/breadcrumbs';
import { RendererFunction } from '../utils/typed_react';

interface WithKibanaChromeProps {
  children: RendererFunction<
    {
      setBreadcrumbs: (newBreadcrumbs: Breadcrumb[]) => void;
      setBadge: (badge: Badge | undefined) => void;
    } & WithKibanaChromeState
  >;
}

interface WithKibanaChromeState {
  basePath: string;
}

export class WithKibanaChrome extends React.Component<
  WithKibanaChromeProps,
  WithKibanaChromeState
> {
  public state: WithKibanaChromeState = {
    basePath: chrome.getBasePath(),
  };

  public render() {
    return this.props.children({
      ...this.state,
      setBreadcrumbs: chrome.breadcrumbs.set,
      setBadge: chrome.badge.set,
    });
  }
}
