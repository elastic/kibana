/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { StatementListHeading } from './statement_list_heading';
import { EuiSpacer } from '@elastic/eui';
import { StatementList } from './statement_list';

export function StatementSection({ iconType, headingText, elements, onShowVertexDetails }) {
  if (!elements.length) {
    return null;
  }

  return (
    <div data-test-subj={`pipelineViewerSection_${headingText}`}>
      <StatementListHeading iconType={iconType} title={headingText} />
      <EuiSpacer size="s" />
      <StatementList elements={elements} onShowVertexDetails={onShowVertexDetails} />
    </div>
  );
}

StatementSection.propTypes = {
  elements: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      // top-level elements have null parentId
      parentId: PropTypes.string,
    })
  ).isRequired,
  headingText: PropTypes.string.isRequired,
  iconType: PropTypes.string.isRequired,
  onShowVertexDetails: PropTypes.func.isRequired,
};
