/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { MemoryRouter, match } from 'react-router-dom';
import renderer from 'react-test-renderer';
import {
  mockFunction,
  createLocation,
  createMatch,
  createHistory,
} from '../../../utils/test_utils';
import { CodeSymbolTree } from '../code_symbol_tree';
import { props } from './__fixtures__/props';
import { MainRouteParams, PathTypes } from '../../../common/types';
import { History, Location } from 'history';

const location: Location = createLocation({
  pathname:
    '/github.com/vmware/clarity/blob/master/src/clr-angular/data/stack-view/stack-control.ts',
});

const m: match<MainRouteParams> = createMatch({
  path: '/:resource/:org/:repo/:pathType(blob|tree)/:revision/:path*:goto(!.*)?',
  url: '/github.com/vmware/clarity/blob/master/src/clr-angular/data/stack-view/stack-control.ts',
  isExact: true,
  params: {
    resource: 'github.com',
    org: 'google',
    repo: 'vmware',
    pathType: PathTypes.blob,
    revision: 'master',
    path: 'src/clr-angular/data/stack-view/stack-control.ts',
  },
});

const history: History = createHistory({ location, length: 8, action: 'POP' });

test('render symbol tree correctly', () => {
  const tree = renderer
    .create(
      <MemoryRouter>
        <CodeSymbolTree
          location={location}
          history={history}
          match={m}
          structureTree={props.structureTree}
          closedPaths={[]}
          openSymbolPath={mockFunction}
          closeSymbolPath={mockFunction}
          uri="git://github.com/vmware/clarity/blob/master/src/clr-angular/data/stack-view/stack-control.ts"
        />
      </MemoryRouter>
    )
    .toJSON();
  expect(tree).toMatchSnapshot();
});
