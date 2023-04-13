/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import {
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiPageContentBody,
  EuiPageHeader,
  EuiTitle,
  EuiMarkdownFormat,
} from '@elastic/eui';

export function examplePage(title: string): JSX.Element {
  const content =
    `Hoping I could have "shared" \`.md\` files that would be easily viewable / linkable up on GH, but also work as content in this Kibana page, but ... didn't see any easy way to do that.
  
So here's the link to GH, describing this example:

[x-pack/examples/ow22_pmuellr/docs/README.md](https://github.com/pmuellr/kibana/blob/onweek/2022/x-pack/examples/ow22_pmuellr/docs/README.md)
  `.trim();

  return (
    <EuiPage>
      <EuiPageBody>
        <EuiPageHeader>
          <EuiTitle size="l">
            <h1>{title}</h1>
          </EuiTitle>
        </EuiPageHeader>
        <EuiPageContent>
          <EuiPageContentBody>
            <EuiMarkdownFormat>{content}</EuiMarkdownFormat>
          </EuiPageContentBody>
        </EuiPageContent>
      </EuiPageBody>
    </EuiPage>
  );
}
