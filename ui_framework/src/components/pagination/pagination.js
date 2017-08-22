import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

import {
  KuiButtonEmpty,
} from '../../components';

export const KuiPagination = ({
  className,
  pageList,
  lastPage,
  activePage,
  ...rest,
}) => {
  const classes = classNames('kuiPagination', className);

  // This button will always show in mobile layouts if available.
  let optionalPreviousButton = null;
  if (activePage !== 1) {
    optionalPreviousButton = (
      <KuiButtonEmpty
        className="kuiPagination__button kuiPagination__button--keepMobile"
        iconType="arrowLeft"
        size="small"
      >
        Previous
      </KuiButtonEmpty>
    );
  }

  // This button will always show in mobile layouts if available.
  let optionalNextButton = null;
  if (activePage !== lastPage) {
    optionalNextButton = (
      <KuiButtonEmpty
        className="kuiPagination__button kuiPagination__button--keepMobile"
        iconType="arrowRight"
        iconSide="right"
        size="small"
      >
        Next
      </KuiButtonEmpty>
    );
  }

  let optionalFirstPage = null;
  if (pageList[0].number > 2) {
    optionalFirstPage = (
      <div className="kuiPagination__flex">
        <KuiButtonEmpty
          className="kuiPagination__button"
          size="small"
        >
          1
        </KuiButtonEmpty>
        <KuiButtonEmpty
          className="kuiPagination__button"
          size="small"
          disabled
        >
          ..
        </KuiButtonEmpty>
      </div>
    );
  }

  let optionalLastPage = null;
  if (lastPage && (lastPage !== pageList[pageList.length -1].number)) {
    optionalLastPage = (
      <div className="kuiPagination__flex">
        <KuiButtonEmpty
          className="kuiPagination__button"
          size="small"
          disabled
        >
          ..
        </KuiButtonEmpty>
        <KuiButtonEmpty
          className="kuiPagination__button"
          size="small"
        >
          {lastPage}
        </KuiButtonEmpty>
      </div>
    );
  }

  return (
    <div
      className={classes}
      {...rest}
    >
      {optionalPreviousButton}
      {optionalFirstPage}
      {pageList.map((option, index) => {
        const buttonClass = classNames(
          'kuiPagination__button',
          {
            'kuiPagination__button--active': (option.number === activePage),
          },
        );
        return(
          <KuiButtonEmpty
            className={buttonClass}
            size="small"
            key={index}
          >
            {option.number}
          </KuiButtonEmpty>
        );
      })}
      {optionalLastPage}
      {optionalNextButton}
    </div>
  );
};

KuiPagination.propTypes = {
  className: PropTypes.string,
};
