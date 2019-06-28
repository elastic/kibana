/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import $ from 'jquery';
import { uiModules } from 'ui/modules';

const app = uiModules.get('xpack/watcher');

app.directive('xpackAriaDescribes', function () {
  return {
    restrict: 'A',
    link: function ($scope, $ele, attr) {
      if (!Object.keys(attr).includes('id')) {
        throw new Error(`An element with xpack-aria-describes="${attr.xpackAriaDescribes}" does not have an id attribute defined`);
      }

      let selector = '';

      function updateAriaDescribedBy(elementId, targetIdList, targetLength, remove = false) {
        if (!elementId || !targetIdList || targetLength === 0) {
          return;
        }

        const targetIds = targetIdList.split(' ');
        targetIds.forEach(targetId => {
          const $target = $(`#${targetId}`);

          // Preserve any existing ids in the target's aria-describedby attribute
          const describedby = $target.attr('aria-describedby');
          const describedByParts = describedby ? describedby.split(' ') : [];
          const targetIndex = describedByParts.indexOf(elementId);

          if (remove) {
            // remove this control's id from the list if it is there.
            if (targetIndex !== -1) {
              describedByParts.splice(targetIndex, 1);
            }
          } else {
            // add this control's id to the list if it is not already there.
            if (targetIndex === -1) {
              describedByParts.push(elementId);
            }
          }

          if (describedByParts.length === 0) {
            $target.removeAttr('aria-describedby');
          } else {
            const newDescribedBy = describedByParts.join(' ');
            $target.attr('aria-describedby', newDescribedBy);
          }
        });
      }

      $scope.$watch(() => attr.xpackAriaDescribes, (xpackAriaDescribes) => {
        const ids = xpackAriaDescribes.split(' ');
        selector = ids.map(id => `#${id}`).join(',');

        $scope.targetIdList = xpackAriaDescribes;
      });

      $scope.$watchMulti([
        () => attr.id,
        'targetIdList',
        () => $(selector).length
      ], ([elementId, targetIdList, targetLength]) => {
        updateAriaDescribedBy(elementId, targetIdList, targetLength);
      });

      $scope.$on('$destroy', () => {
        const elementId = attr.id;
        const targetIdList = $scope.targetIdList;
        const targetLength = $(selector).length;

        updateAriaDescribedBy(elementId, targetIdList, targetLength, true);
      });
    }
  };
});
