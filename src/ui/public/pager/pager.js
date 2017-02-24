function clamp(val, min, max) {
  return Math.min(Math.max(min, val), max);
}

export class Pager {
  constructor(totalItems, pageSize, startingPage) {
    this.currentPage = startingPage;
    this.totalItems = totalItems;
    this.pageSize = pageSize;
  }

  get pageCount() {
    return Math.ceil(this.totalItems / this.pageSize);
  }

  get hasNextPage() {
    return this.currentPage < this.totalPages;
  }

  get hasPreviousPage() {
    return this.currentPage > 1;
  }

  get startNumber() {
    const startNumber = ((this.currentPage - 1) * this.pageSize) + 1;
    return clamp(startNumber, 0, this.totalItems);
  }

  get endNumber() {
    const endNumber = (this.startNumber - 1) + this.pageSize;
    return clamp(endNumber, 0, this.totalItems);
  }

  get totalPages() {
    return Math.ceil(this.totalItems / this.pageSize);
  }
}
