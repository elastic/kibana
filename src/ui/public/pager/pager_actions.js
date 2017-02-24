function clamp(val, min, max) {
  return Math.min(Math.max(min, val), max);
}

export class PagerActions {
  static nextPage(pager) {
    pager.currentPage = clamp(pager.currentPage + 1, 1, pager.totalPages);
  }

  static previousPage(pager) {
    pager.currentPage = clamp(pager.currentPage - 1, 1, pager.totalPages);
  }

  static setTotalItems(pager, count) {
    pager.totalItems = count;
  }

  static setPageSize(pager, count) {
    pager.pageSize = count;
  }

  static calculateItemsOnPage(pager, items) {
    this.setTotalItems(pager, items.length);
    const startItemIndex = pager.startNumber - 1;
    const endItemIndex = pager.endNumber;
    return items.slice(startItemIndex, endItemIndex);
  }
}
