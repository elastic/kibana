/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

//MH TODO - I'm not 100% on managing dependencies. I added these 2 dependencies
// to the source code and it seems to work.
import d3 from 'd3';
import { distanceFromIntersectArea } from 'venn.js';

import { uiModules } from 'ui/modules';

uiModules.get('app/graph')
  .directive('venn', function () {
    return {
      scope: {
        venn: '=',
        vennKey: '=?',
        vennKeySize: '=?',
        vennMap: '=?'
      },
      restrict: 'AE',
      controller: function ($scope, $element) {
        $scope.$watch('venn', function () {
          const element = $element[0];
          //Remove current contents
          while (element.firstChild) {
            element.removeChild(element.firstChild);
          }
          const params = $scope.venn;
          if (!params) {
            return;
          }
          const height = params.height ? params.height : '50px';
          const width = params.width ? params.width : '200px';
          const v1 = params.v1 ? params.v1 : 10;
          const v2 = params.v2 ? params.v2 : 10;
          const overlap = params.overlap ? params.overlap : 5;
          const v1Class = params.v1Class ? params.v1Class : 'venn1';
          const v2Class = params.v2Class ? params.v2Class : 'venn2';
          const r1 = Math.sqrt(v1 / Math.PI);
          const r2 = Math.sqrt(v2 / Math.PI);

          const maxR = Math.max(r1, r2);
          let x1 = r1;
          const y1 = maxR;
          let x2 = x1 + distanceFromIntersectArea(r1, r2, overlap);
          const y2 = maxR;

          //Shift right to centre image
          const imageWidth = (maxR * 4);
          const blankRight = imageWidth - (x2 + r2);
          x1 += blankRight / 2;
          x2 += blankRight / 2;

          const viewBoxDims = '0 0 ' + imageWidth + ' ' + (maxR * 2);
          const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
          svg.setAttribute('width', width);
          svg.setAttribute('height', height);
          svg.setAttribute('viewBox', viewBoxDims);
          const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
          const circle1 = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
          circle1.setAttribute('cx', x1);
          circle1.setAttribute('cy', y1);
          circle1.setAttribute('rx', r1);
          circle1.setAttribute('ry', r1);
          circle1.setAttribute('class', v1Class);
          g.appendChild(circle1);
          const circle2 = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
          circle2.setAttribute('cx', x2);
          circle2.setAttribute('cy', y2);
          circle2.setAttribute('rx', r2);
          circle2.setAttribute('ry', r2);
          circle2.setAttribute('class', v2Class);
          g.appendChild(circle2);
          svg.appendChild(g);
          element.appendChild(svg);
        }, true);
      }
    };
  });
