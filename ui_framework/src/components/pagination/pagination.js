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

  let optionalPreviousButton = null;

  if (activePage !== 1) {
    optionalPreviousButton = (
      <KuiButtonEmpty className="kuiPagination__button" iconType="arrowLeft" size="small">Previous</KuiButtonEmpty>
    );
  }

  let optionalNextButton = null;
  if (activePage !== lastPage) {
    optionalNextButton = (
      <KuiButtonEmpty className="kuiPagination__button" iconType="arrowRight" iconSide="right" size="small">Next</KuiButtonEmpty>
    );
  }

  let optionalFirstPage = null;
  if (pageList[0].number > 2) {
    optionalFirstPage = (
      <span>
        <KuiButtonEmpty className="kuiPagination__button" size="small">1</KuiButtonEmpty>
        <KuiButtonEmpty className="kuiPagination__button" size="small" disabled>..</KuiButtonEmpty>
      </span>
    );
  }

  let optionalLastPage = null;
  if (lastPage && (lastPage !== pageList[pageList.length -1].number)) {
    optionalLastPage = (
      <span>
        <KuiButtonEmpty className="kuiPagination__button" size="small" disabled>..</KuiButtonEmpty>
        <KuiButtonEmpty className="kuiPagination__button" size="small">{lastPage}</KuiButtonEmpty>
      </span>
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
          <KuiButtonEmpty  className={buttonClass} size="small" key={index}>{option.number}</KuiButtonEmpty>
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
