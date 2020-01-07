/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import { EuiScreenReaderOnly } from '@elastic/eui';
import React from 'react';

import { GraphState, metaDataSelector } from '../state_management';

interface GraphTitleProps {
  title: string;
}

/**
 * Component showing the title of the current workspace as a heading visible for screen readers
 */
export const GraphTitle = connect<GraphTitleProps, {}, {}, GraphState>((state: GraphState) => ({
  title: metaDataSelector(state).title,
}))(({ title }: GraphTitleProps) => (
  <EuiScreenReaderOnly>
    <h1>{title}</h1>
  </EuiScreenReaderOnly>
));
