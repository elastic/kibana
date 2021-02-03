/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import angular from 'angular';
import React from 'react';
import { Plugin, CoreSetup } from 'kibana/public';
import { DiscoverSetup } from '../../../../../src/plugins/discover/public';

angular.module('myDocView', []).directive('myHit', () => ({
  restrict: 'E',
  scope: {
    hit: '=hit',
  },
  template: '<h1 data-test-subj="angular-docview">{{hit._index}}</h1>',
}));

function MyHit(props: { index: string }) {
  return <h1 data-test-subj="react-docview">{props.index}</h1>;
}

export class DocViewsPlugin implements Plugin<void, void> {
  public setup(core: CoreSetup, { discover }: { discover: DiscoverSetup }) {
    discover.docViews.addDocView({
      directive: {
        controller: function MyController($injector: any) {
          $injector.loadNewModules(['myDocView']);
        },
        template: `<my-hit hit="hit"></my-hit>`,
      },
      order: 1,
      title: 'Angular doc view',
    });

    discover.docViews.addDocView({
      component: (props) => {
        return <MyHit index={props.hit._index as string} />;
      },
      order: 2,
      title: 'React doc view',
    });
  }

  public start() {}
}
