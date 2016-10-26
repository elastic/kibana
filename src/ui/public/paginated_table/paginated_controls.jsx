import * as React from 'react';
import { PageSizeSelector } from './page_size_selector';

export class PaginatedControls extends React.Component {
  constructor(props) {
    super(props);
  }

  createGoToPageListItem(goToPage, display, className) {
    const { paginate } = this.props;
    return (
      <li className={className} key={display}>
        <span onClick={() => paginate.goToPage(goToPage)}>{display}</span>
      </li>
    );
  }

  getPrevNavigation() {
    const { page } = this.props;
    if (page.first) return null;
    return this.createGoToPageListItem(page.prev, '«');
  }

  getNextNavigation() {
    const { page } = this.props;
    if (page.last) return null;
    return this.createGoToPageListItem(page.next, '»');
  }

  getJumpToFirstNavigation() {
    const { otherPages } = this.props;
    if (otherPages.containsFirst) return null;
    return this.createGoToPageListItem(1, '1...');
  }

  getJumpToLastNavigation() {
    const { page, otherPages } = this.props;
    if (otherPages.containsLast) return null;
    return this.createGoToPageListItem(page.count, `... ${page.count}`);
  }

  getPageLinks() {
    const { page, otherPages } = this.props;
    let pageLinks = [];
    for (let i = 0; i < otherPages.length; i++) {
      const otherPage = otherPages[i];
      const className = otherPage.number === page.number ? 'active' : '';
      pageLinks.push(this.createGoToPageListItem(otherPage, otherPage.number, className));
    }
    return pageLinks;
  }

  getPageSizeSelector() {
    const { showSelector } = this.props;
    if (!showSelector) return null;

    const { perPage, sizeOptions } = this.props.paginate;
    return <PageSizeSelector
        perPage={perPage}
        sizeOptions={sizeOptions}
        onChange={this.props.onPerPageSizeChange}
      />;
  }

  getPageNavigation() {
    if (this.props.page.count <= 1) return null;
    return (
        <ul className="pagination-other-pages-list pagination-sm">
          {this.getPrevNavigation()}
          {this.getJumpToFirstNavigation()}
          {this.getPageLinks()}
          {this.getJumpToLastNavigation()}
          {this.getNextNavigation()}
        </ul>
    );
  }

  render() {
    const { page, otherPages } = this.props;
    if (!page || !otherPages) return null;
    return (
      <div className="paginate-container">
        <div className="pagination-other-pages">
          {this.getPageNavigation()}
        </div>
        {this.getPageSizeSelector()}
      </div>
    );
  }
}

PaginatedControls.propTypes = {
  page: React.PropTypes.array,
  otherPages: React.PropTypes.array,
  paginate: React.PropTypes.object,
  showSelector: React.PropTypes.bool
};
