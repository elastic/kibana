export class ItemSelectionActions {
  /**
   *
   * @param state {ItemTableState}
   */
  constructor(state) {
    this.state = state;
  }

  deselectAll() {
    this.state.selectedIds = [];
  }

  selectAll() {
    this.deselectAll();
    this.state.pageOfItems.forEach(item => this.state.selectedIds.push(item.id));
  }

  toggleAll() {
    if (this.state.areAllItemsSelected()) {
      this.deselectAll();
    } else {
      this.selectAll();
    }
  }

  selectItem(item) {
    if (!this.state.isItemSelected(item)) {
      this.state.selectedIds.push(item.id);
    }
  }

  deselectItem(item) {
    if (this.state.isItemSelected(item)) {
      const index = this.state.selectedIds.indexOf(item.id);
      this.state.selectedIds.splice(index, 1);
    }
  }
}
