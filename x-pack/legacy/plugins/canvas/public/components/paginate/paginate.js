/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import PropTypes from 'prop-types';

export const Paginate = props => {
  return props.children({
    rows: props.partialRows,
    perPage: props.perPage,
    pageNumber: props.pageNumber,
    totalPages: props.totalPages,
    nextPageEnabled: props.nextPageEnabled,
    prevPageEnabled: props.prevPageEnabled,
    setPage: num => props.setPage(num),
    nextPage: props.nextPage,
    prevPage: props.prevPage,
  });
};

Paginate.propTypes = {
  children: PropTypes.func.isRequired,
  partialRows: PropTypes.array.isRequired,
  perPage: PropTypes.number.isRequired,
  pageNumber: PropTypes.number.isRequired,
  totalPages: PropTypes.number.isRequired,
  nextPageEnabled: PropTypes.bool.isRequired,
  prevPageEnabled: PropTypes.bool.isRequired,
  setPage: PropTypes.func.isRequired,
  nextPage: PropTypes.func.isRequired,
  prevPage: PropTypes.func.isRequired,
};
