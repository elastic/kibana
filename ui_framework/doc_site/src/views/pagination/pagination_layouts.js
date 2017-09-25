import React, {
  Component,
} from 'react';

import {
  KuiPagination,
  KuiFlexGroup,
  KuiFlexItem,
  KuiHorizontalRule,
  KuiText,
} from '../../../../components';

export default class extends Component {
  constructor(props) {
    super(props);

    this.state = {
      activePage: 0
    };

    this.PAGE_COUNT = 10;
  }

  goToPage = pageNumber => {
    this.setState({
      activePage: pageNumber,
    });
  }

  render() {
    return (
      <div>
        <KuiHorizontalRule />

        <KuiFlexGroup justifyContent="spaceAround">
          <KuiFlexItem grow={false}>
            <KuiPagination
              pageCount={this.PAGE_COUNT}
              activePage={this.state.activePage}
              onPageClick={this.goToPage}
            />
          </KuiFlexItem>
        </KuiFlexGroup>

        <KuiHorizontalRule />

        <KuiFlexGroup justifyContent="spaceBetween" alignItems="center">
          <KuiFlexItem grow={false}>
            <KuiText size="s"><p>5000 results, returned in 2.03 secs.</p></KuiText>
          </KuiFlexItem>
          <KuiFlexItem grow={false}>
            <KuiPagination
              pageCount={this.PAGE_COUNT}
              activePage={this.state.activePage}
              onPageClick={this.goToPage}
            />
          </KuiFlexItem>
        </KuiFlexGroup>
      </div>
    );
  }
}
