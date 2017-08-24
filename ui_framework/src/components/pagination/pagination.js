import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

import { KuiPaginationButton } from './pagination_button';

const MAX_VISIBLE_PAGES = 5;
const NUMBER_SURROUNDING_PAGES = Math.floor(MAX_VISIBLE_PAGES * 0.5);

export const KuiPagination = ({
  className,
  pageCount,
  activePage,
  onPageClick,
  ...rest,
}) => {
  const classes = classNames('kuiPagination', className);

  const pages = [];
  const firstPageInRange = Math.max(0, Math.min(activePage - NUMBER_SURROUNDING_PAGES, pageCount - MAX_VISIBLE_PAGES));
  const lastPageInRange = Math.min(pageCount, firstPageInRange + MAX_VISIBLE_PAGES);

  for (let i = firstPageInRange, index = 0; i < lastPageInRange; i++, index++) {
    pages.push(
      <KuiPaginationButton
        isActive={i === activePage}
        key={index}
        onClick={onPageClick.bind(null, i)}
        hideOnMobile
      >
        {i + 1}
      </KuiPaginationButton>
    );
  }

  let previousButton;

  if (activePage !== 0) {
    previousButton = (
      <KuiPaginationButton
        onClick={onPageClick.bind(null, activePage - 1)}
        iconType="arrowLeft"
      >
        Previous
      </KuiPaginationButton>
    );
  }

  const firstPageButtons = [];

  if (firstPageInRange > 0) {
    firstPageButtons.push(
      <KuiPaginationButton
        key="0"
        onClick={onPageClick.bind(null, 0)}
        hideOnMobile
      >
        1
      </KuiPaginationButton>
    );

    if (firstPageInRange > 1) {
      firstPageButtons.push(
        <KuiPaginationButton
          key="beginningEllipsis"
          isPlaceholder
          hideOnMobile
        />
      );
    }
  }

  const lastPageButtons = [];

  if (lastPageInRange < pageCount) {
    if (lastPageInRange < pageCount - 1) {
      lastPageButtons.push(
        <KuiPaginationButton
          key="endingEllipsis"
          isPlaceholder
          hideOnMobile
        />
      );
    }

    lastPageButtons.push(
      <KuiPaginationButton
        key={pageCount - 1}
        onClick={onPageClick.bind(null, pageCount - 1)}
        hideOnMobile
      >
        {pageCount}
      </KuiPaginationButton>
    );
  }

  let nextButton;

  if (activePage !== pageCount - 1) {
    nextButton = (
      <KuiPaginationButton
        onClick={onPageClick.bind(null, activePage + 1)}
        iconType="arrowRight"
        iconSide="right"
      >
        Next
      </KuiPaginationButton>
    );
  }

  return (
    <div
      className={classes}
      {...rest}
    >
      {previousButton}
      {firstPageButtons}
      {pages}
      {lastPageButtons}
      {nextButton}
    </div>
  );
};

KuiPagination.propTypes = {
  className: PropTypes.string,
  pagesCount: PropTypes.number,
  activePage: PropTypes.number,
  onPageClick: PropTypes.func,
  pageLinkProvider: PropTypes.func,
};
