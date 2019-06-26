/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { uiModules } from 'ui/modules';
import 'plugins/watcher/directives/check_box';
import 'plugins/watcher/directives/tooltip';
import 'plugins/watcher/directives/sortable_column';
import template from './watch_table.html';
import 'plugins/watcher/components/watch_state_icon';

const app = uiModules.get('xpack/watcher');

app.directive('watchTable', function () {
  return {
    restrict: 'E',
    replace: true,
    template: template,
    scope: {
      watches: '=',
      watchesBeingDeleted: '=',
      sortField: '=',
      sortReverse: '=',
      onSortChange: '=',
      onSelectChange: '='
    },
    controllerAs: 'watchTable',
    bindToController: true,
    controller: class WatchTableController {
      constructor($scope) {
        this.allSelected = false;

        $scope.$watch('watchTable.watches', (watches) => {
          const previousItems = this.items;

          this.items = _.map(watches, (watch) => {
            const matchedItem = _.find(previousItems, previousItem => previousItem.watch.id === watch.id);
            const selected = Boolean(_.get(matchedItem, 'selected'));
            return { watch: watch, selected: selected };
          });
          this.editableItems = this.items.filter(item => this.isEditable(item));
          this.updateSelectedWatches();
        });

        $scope.$watch('watchTable.watchesBeingDeleted', watches => {
          this.items.forEach(item => {
            const matchedItem = _.find(watches, watch => watch.id === item.watch.id);
            item.selected = false;
            item.isBeingDeleted = Boolean(matchedItem);
          });
          this.editableItems = this.items.filter(item => this.isEditable(item));
          this.updateSelectedWatches();
        });
      }

      onAllSelectedChange = (itemId, allSelected) => {
        _.forEach(this.editableItems, item => {
          item.selected = allSelected;
        });
        this.updateSelectedWatches();
      };

      onWatchSelectedChange = (watchId, selected) => {
        _.find(this.items, item => item.watch.id === watchId).selected = selected;
        this.updateSelectedWatches();
      };

      updateSelectedWatches = () => {
        const selectedItems = _.filter(this.items, item => item.selected);
        const selectedWatches = _.map(selectedItems, item => item.watch);

        const areAllEditableItemsSelected = selectedWatches.length === this.editableItems.length;
        this.allSelected = areAllEditableItemsSelected && this.editableItems.length > 0;

        this.onSelectChange(selectedWatches);
      };

      isEditable = (item) => {
        return !item.watch.isSystemWatch && !item.isBeingDeleted;
      }

      areAnyEditable = () => {
        return this.editableItems.length !== 0;
      }
    }
  };
});
