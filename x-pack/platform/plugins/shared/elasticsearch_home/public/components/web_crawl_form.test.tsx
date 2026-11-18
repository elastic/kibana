/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import { renderWithHomeContext } from '../test_utils';
import { WebCrawlForm } from './web_crawl_form';

const INVALID_URL_MESSAGE = 'Enter a URL that starts with http:// or https://';
const SERVER_ERROR = 'example.com is already being crawled';

// The panel's tests cover validation and submission end to end; these cover the form's own props.
describe('WebCrawlForm', () => {
  const onSubmit = jest.fn();

  const renderForm = (props: { isStarting?: boolean; errorMessage?: string } = {}) =>
    renderWithHomeContext(<WebCrawlForm onSubmit={onSubmit} isStarting={false} {...props} />);

  const getUrlInput = () => screen.getByTestId('elasticsearchHomeWebCrawlUrl');
  const getSubmitButton = () => screen.getByTestId('elasticsearchHomeWebCrawlSubmit');
  const getMaxDepthInput = () => screen.getByTestId('elasticsearchHomeWebCrawlMaxDepth');
  const getMaxDocumentsInput = () => screen.getByTestId('elasticsearchHomeWebCrawlMaxDocuments');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('hands the trimmed URL and the limits to the caller', () => {
    renderForm();
    fireEvent.change(getUrlInput(), { target: { value: ' https://example.com ' } });
    fireEvent.change(getMaxDepthInput(), { target: { value: '0' } });
    fireEvent.change(getMaxDocumentsInput(), { target: { value: '7' } });

    fireEvent.click(getSubmitButton());

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith({
      url: 'https://example.com',
      maxDepth: 0,
      maxDocuments: 7,
    });
  });

  it('keeps what the user entered after submitting', () => {
    renderForm();
    fireEvent.change(getUrlInput(), { target: { value: 'https://example.com' } });
    fireEvent.change(getMaxDepthInput(), { target: { value: '4' } });

    fireEvent.click(getSubmitButton());

    expect(getUrlInput()).toHaveValue('https://example.com');
    expect(getMaxDepthInput()).toHaveValue(4);
  });

  it('disables every control while a crawl is starting', () => {
    renderForm({ isStarting: true });

    expect(getUrlInput()).toBeDisabled();
    expect(getSubmitButton()).toBeDisabled();
    expect(getMaxDepthInput()).toBeDisabled();
    expect(getMaxDocumentsInput()).toBeDisabled();
  });

  it("shows the server's answer to the last submission without marking the URL invalid", () => {
    renderForm({ errorMessage: SERVER_ERROR });

    expect(screen.getByText(SERVER_ERROR)).toBeInTheDocument();
    expect(getUrlInput()).not.toBeInvalid();
  });

  it("shows a validation error instead of the server's answer", () => {
    renderForm({ errorMessage: SERVER_ERROR });
    fireEvent.change(getUrlInput(), { target: { value: 'not a url' } });

    fireEvent.click(getSubmitButton());

    expect(screen.getByText(INVALID_URL_MESSAGE)).toBeInTheDocument();
    expect(screen.queryByText(SERVER_ERROR)).not.toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("shows an invalid limit instead of the server's answer", () => {
    renderForm({ errorMessage: SERVER_ERROR });

    fireEvent.change(getMaxDocumentsInput(), { target: { value: '0' } });

    expect(screen.getByText(/Max depth must be a whole number/)).toBeInTheDocument();
    expect(screen.queryByText(SERVER_ERROR)).not.toBeInTheDocument();
  });

  it('reports an invalid URL before invalid limits', () => {
    renderForm();
    fireEvent.change(getMaxDepthInput(), { target: { value: '9' } });
    fireEvent.change(getUrlInput(), { target: { value: 'not a url' } });

    fireEvent.click(getSubmitButton());

    expect(screen.getByText(INVALID_URL_MESSAGE)).toBeInTheDocument();
    expect(screen.queryByText(/Max depth must be a whole number/)).not.toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
