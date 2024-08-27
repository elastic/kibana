/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { FlyoutBody } from './flyout_body';

const text = 'some text';
const dataTestSubj = 'flyout body';

describe('<FlyoutBody />', () => {
  it('should render body', () => {
    const { getByTestId } = render(<FlyoutBody data-test-subj={dataTestSubj}>{text}</FlyoutBody>);
    expect(getByTestId(dataTestSubj)).toBeInTheDocument();
    expect(getByTestId(dataTestSubj)).toHaveTextContent(text);
  });
});
