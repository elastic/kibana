function clamp(val, min, max) {
  return Math.min(Math.max(min, val), max);
}

export class Pager {
  constructor(itemsPerPage) {
    this.itemsPerPage = itemsPerPage;
  }

  canPagePrevious(currentPage) {
    return currentPage > 0;
  }

  canPageNext(itemsCount, currentPage) {
    const pagesCount = this.getPagesCount(itemsCount);
    return currentPage < pagesCount - 1;
  }

  getItemsOnPage(items, currentPage) {
    const startIndex = currentPage * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    return items.filter((item, index) => (
      index >= startIndex
      && index < endIndex
    ));
  }

  getPagesCount(itemsCount) {
    return Math.ceil(itemsCount / this.itemsPerPage);
  }

  getLastPageIndex(itemsCount) {
    const pagesCount = this.getPagesCount(itemsCount);
    return pagesCount > 0 ? pagesCount - 1 : 0;
  }

  getStartNumber(itemsCount, currentPageIndex) {
    if (itemsCount === 0) return 0;
    const startNumber = (currentPageIndex * this.itemsPerPage) + 1;
    return clamp(startNumber, 0, itemsCount);
  }

  getEndNumber(itemsCount, currentPage) {
    if (itemsCount === 0) return 0;
    const startNumber = this.getStartNumber(itemsCount, currentPage);
    const endNumber = (startNumber - 1) + this.itemsPerPage;
    return clamp(endNumber, 0, itemsCount);
  }
}
