import { uiModules } from 'ui/modules';
import template from './sortable_column.html';

const app = uiModules.get('kibana');

app.directive('sortableColumn', function () {
  return {
    restrict: 'E',
    transclude: true,
    template: template,
    scope: {
      field: '@',
      sortField: '=',
      sortReverse: '=',
      onSortChange: '=',
    },
    controllerAs: 'sortableColumn',
    bindToController: true,
    controller: class SortableColumnController {
      toggle = () => {
        if (this.sortField === this.field) {
          this.onSortChange(this.field, !this.sortReverse);
        } else {
          this.onSortChange(this.field, false);
        }
      }

      getAriaLabel() {
        const direction = this.isSortedAscending() ? 'descending' : 'ascending';
        return `Sort ${this.field} ${direction}`;
      }

      isSorted() {
        return this.sortField === this.field;
      }

      isSortedAscending() {
        return this.isSorted() && !this.sortReverse;
      }

      isSortedDescending() {
        return this.isSorted() && this.sortReverse;
      }
    }
  };
});
