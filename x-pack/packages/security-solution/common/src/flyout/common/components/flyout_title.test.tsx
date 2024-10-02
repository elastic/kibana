/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { FlyoutTitle } from './flyout_title';
import {
  TITLE_HEADER_ICON_TEST_ID,
  TITLE_HEADER_TEXT_TEST_ID,
  TITLE_LINK_ICON_TEST_ID,
} from '../test_ids';

const title = 'test title';
const TEST_ID = 'test';

describe('<FlyoutTitle />', () => {
  it('should render title and icon', () => {
    const { getByTestId, queryByTestId } = render(
      <FlyoutTitle title={title} iconType={'warning'} data-test-subj={TEST_ID} />
    );

    expect(getByTestId(TITLE_HEADER_TEXT_TEST_ID(TEST_ID))).toHaveTextContent(title);
    expect(getByTestId(TITLE_HEADER_ICON_TEST_ID(TEST_ID))).toBeInTheDocument();
    expect(queryByTestId(TITLE_LINK_ICON_TEST_ID(TEST_ID))).not.toBeInTheDocument();
  });

  it('should not render icon if iconType is not passed', () => {
    const { getByTestId, queryByTestId } = render(
      <FlyoutTitle title={title} data-test-subj={TEST_ID} />
    );

    expect(getByTestId(TITLE_HEADER_TEXT_TEST_ID(TEST_ID))).toBeInTheDocument();
    expect(queryByTestId(TITLE_HEADER_ICON_TEST_ID(TEST_ID))).not.toBeInTheDocument();
    expect(queryByTestId(TITLE_LINK_ICON_TEST_ID(TEST_ID))).not.toBeInTheDocument();
  });

  it('should render popout icon if title is a link', () => {
    const { getByTestId } = render(<FlyoutTitle title={title} isLink data-test-subj={TEST_ID} />);

    expect(getByTestId(TITLE_HEADER_TEXT_TEST_ID(TEST_ID))).toHaveTextContent(title);
    expect(getByTestId(TITLE_LINK_ICON_TEST_ID(TEST_ID))).toBeInTheDocument();
    expect(getByTestId(TITLE_LINK_ICON_TEST_ID(TEST_ID))).toBeInTheDocument();
  });
});
