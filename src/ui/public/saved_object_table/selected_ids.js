export class SelectedIds {
  constructor() {
    this.selectedIds = [];
  }

  areAllItemsSelected(items) {
    return this.selectedIds.length === items.length;
  }

  isItemSelected(item) {
    return this.selectedIds.indexOf(item.id) >= 0;
  }

  getSelectedItemsCount() {
    return this.selectedIds.length;
  }

  indexOf(item) {
    return this.selectedIds.indexOf(item.id);
  }
}
