/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback } from 'react';
import { RuleDetails } from '@kbn/alerts-ui-shared/src/rule_form';
import { EuiCodeBlock, EuiTitle } from '@elastic/eui';

export const RuleDetailsSandbox = () => {
  const [formValues, setFormValues] = useState({
    tags: [],
    name: 'test-rule',
  });

  const onChange = useCallback((property: string, value: unknown) => {
    setFormValues((prevFormValues) => ({
      ...prevFormValues,
      [property]: value,
    }));
  }, []);

  return (
    <>
      <div>
        <EuiTitle>
          <h1>Form State</h1>
        </EuiTitle>
        <EuiCodeBlock>{JSON.stringify(formValues, null, 2)}</EuiCodeBlock>
      </div>
      <RuleDetails formValues={formValues} onChange={onChange} />
    </>
  );
};
