/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer } from '@elastic/eui';
import { CaseSuggestionChildrenProps } from '@kbn/case-suggestion-registry-plugin/public';
import { SyntheticsMonitorContext } from '../../common/types';

export const CaseSuggestionChildren: React.FC<
  CaseSuggestionChildrenProps<SyntheticsMonitorContext>
> = (props: CaseSuggestionChildrenProps<SyntheticsMonitorContext>) => {
  const { caseSuggestion } = props;
  return (
    <div>
      <h2>Case Suggestion Children Custom Component</h2>
      <p>
        This component displays details about a synthetics monitors found via the case suggestion
        registry:
      </p>
      <EuiSpacer size="m" />
      {caseSuggestion.description && <p>{caseSuggestion.description}</p>}
      {caseSuggestion.data.map((monitor) => (
        <div key={monitor.payload.id}>
          <h3>{monitor.payload.name}</h3>
          <p>{monitor.description}</p>
          <p>Monitor ID: {monitor.payload.id}</p>
        </div>
      ))}
    </div>
  );
};

// Required for usage in React.lazy
// eslint-disable-next-line import/no-default-export
export default CaseSuggestionChildren;
