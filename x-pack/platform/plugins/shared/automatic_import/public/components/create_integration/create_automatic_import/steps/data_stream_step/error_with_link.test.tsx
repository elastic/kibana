/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { ErrorMessage, isErrorMessageWithLink, MessageLink } from './error_with_link';

describe('isErrorMessageWithLink', () => {
  it('should return true when error is an ErrorMessageWithLink', () => {
    const error = {
      link: 'http://example.com',
      errorMessage: 'An error occurred',
      linkText: 'decode_cef',
    };
    expect(isErrorMessageWithLink(error)).toBe(true);
  });

  it('should return false when error is a string', () => {
    const error = 'An error occurred';
    expect(isErrorMessageWithLink(error)).toBe(false);
  });

  describe('MessageLink', () => {
    it('should render link with correct href and text', () => {
      const { getByText } = render(<MessageLink link="http://example.com" linkText="decode_cef" />);
      const linkElement = getByText('decode_cef');
      expect(linkElement).toBeInTheDocument();
      expect(linkElement).toHaveAttribute('href', 'http://example.com');
    });
  });

  describe('ErrorMessage', () => {
    it('should render error message when error is a string', () => {
      const error = 'An error occurred';
      const { getByText } = render(<ErrorMessage error={error} />);
      expect(getByText('An error occurred')).toBeInTheDocument();
    });
  });
});
