/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import { createWebCrawl, renderWithWebCrawlerContext } from '../test_utils';
import { WebCrawlScheduleModal } from './web_crawl_schedule_modal';

const INVALID_EVERY_MESSAGE = 'Enter a whole number from 1 to 365.';
const SERVER_ERROR = 'Invalid workflow yaml';
const INVALID_URL_MESSAGE = 'Enter a URL that starts with http:// or https://';

const crawl = createWebCrawl({
  url: 'https://example.com/docs',
  status: 'completed',
  maxDepth: 4,
  maxDocuments: 120,
});

describe('WebCrawlScheduleModal', () => {
  const onConfirm = jest.fn();
  const onCancel = jest.fn();

  const renderModal = (props: { isCreating?: boolean; errorMessage?: string } = {}) =>
    renderWithWebCrawlerContext(
      <WebCrawlScheduleModal
        crawl={crawl}
        isCreating={false}
        onConfirm={onConfirm}
        onCancel={onCancel}
        {...props}
      />
    );

  const getEveryInput = () => screen.getByTestId('webCrawlScheduleEvery');
  const getUnitSelect = () => screen.getByTestId('webCrawlScheduleUnit');
  const getConfirmButton = () => screen.getByTestId('confirmModalConfirmButton');
  const getCancelButton = () => screen.getByTestId('confirmModalCancelButton');
  const setEvery = (value: string) => fireEvent.change(getEveryInput(), { target: { value } });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('describes the crawl it schedules and defaults to every day', () => {
    renderModal();

    expect(
      screen.getByRole('alertdialog', { name: 'Schedule a recurring crawl' })
    ).toBeInTheDocument();
    expect(screen.getByTestId('webCrawlScheduleModal')).toHaveTextContent(
      'Creates a workflow that crawls https://example.com/docs again on this interval'
    );
    expect(getEveryInput()).toHaveValue(1);
    expect(getUnitSelect()).toHaveValue('d');
    expect(getConfirmButton()).toBeEnabled();
    expect(getConfirmButton()).toHaveTextContent('Create workflow');
    expect(screen.queryByText(INVALID_EVERY_MESSAGE)).not.toBeInTheDocument();
  });

  it('gives both interval controls an accessible name', () => {
    renderModal();

    expect(screen.getByRole('spinbutton', { name: 'Crawl every' })).toBe(getEveryInput());
    expect(screen.getByRole('combobox', { name: 'Interval unit' })).toBe(getUnitSelect());
  });

  it('offers hours and days as units', () => {
    renderModal();

    const options = Array.from(getUnitSelect().querySelectorAll('option'));

    expect(options.map(({ value, textContent }) => [value, textContent])).toEqual([
      ['h', 'hours'],
      ['d', 'days'],
    ]);
  });

  it("confirms with the crawl's URL and limits and the default interval", () => {
    renderModal();

    fireEvent.click(getConfirmButton());

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledWith({
      url: 'https://example.com/docs',
      maxDepth: 4,
      maxDocuments: 120,
      every: 1,
      unit: 'd',
    });
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('confirms with the interval and unit the user chose', () => {
    renderModal();
    setEvery('12');
    fireEvent.change(getUnitSelect(), { target: { value: 'h' } });

    fireEvent.click(getConfirmButton());

    expect(onConfirm).toHaveBeenCalledWith({
      url: 'https://example.com/docs',
      maxDepth: 4,
      maxDocuments: 120,
      every: 12,
      unit: 'h',
    });
  });

  it.each(['1', '365'])('accepts the boundary interval %p', (value) => {
    renderModal();

    setEvery(value);

    expect(getEveryInput()).not.toHaveAttribute('aria-invalid', 'true');
    expect(screen.queryByText(INVALID_EVERY_MESSAGE)).not.toBeInTheDocument();

    fireEvent.click(getConfirmButton());

    expect(onConfirm).toHaveBeenCalledWith(expect.objectContaining({ every: Number(value) }));
  });

  it.each(['0', '-1', '366', '1.5', ''])(
    'rejects an interval of %p and cannot be confirmed',
    (value) => {
      renderModal();

      setEvery(value);

      expect(screen.getByText(INVALID_EVERY_MESSAGE)).toBeInTheDocument();
      expect(getEveryInput()).toHaveAttribute('aria-invalid', 'true');
      expect(getConfirmButton()).toBeDisabled();

      fireEvent.click(getConfirmButton());

      expect(onConfirm).not.toHaveBeenCalled();
    }
  );

  it('can be confirmed again once an invalid interval is corrected', () => {
    renderModal();
    setEvery('0');
    expect(getConfirmButton()).toBeDisabled();

    setEvery('7');

    expect(screen.queryByText(INVALID_EVERY_MESSAGE)).not.toBeInTheDocument();
    expect(getConfirmButton()).toBeEnabled();
  });

  it("shows the server's error and stays confirmable for a retry", () => {
    renderModal({ errorMessage: SERVER_ERROR });

    expect(screen.getByText(SERVER_ERROR)).toBeInTheDocument();
    expect(getEveryInput()).not.toHaveAttribute('aria-invalid', 'true');
    expect(getConfirmButton()).toBeEnabled();
  });

  it("shows the validation error instead of the server's error", () => {
    renderModal({ errorMessage: SERVER_ERROR });

    setEvery('999');

    expect(screen.getByText(INVALID_EVERY_MESSAGE)).toBeInTheDocument();
    expect(screen.queryByText(SERVER_ERROR)).not.toBeInTheDocument();
  });

  it('cannot be confirmed twice while the workflow is being created', () => {
    renderModal({ isCreating: true });

    expect(getConfirmButton()).toBeDisabled();

    fireEvent.click(getConfirmButton());

    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('cancels from the cancel button', () => {
    renderModal();

    fireEvent.click(getCancelButton());

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('cancels from the close button', () => {
    renderModal();

    fireEvent.click(screen.getByLabelText('Closes this modal window'));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  describe('without a crawl to repeat', () => {
    const renderNewModal = () =>
      renderWithWebCrawlerContext(
        <WebCrawlScheduleModal isCreating={false} onConfirm={onConfirm} onCancel={onCancel} />
      );

    const getUrlInput = () => screen.getByTestId('webCrawlScheduleUrl');
    const setUrl = (value: string) => fireEvent.change(getUrlInput(), { target: { value } });

    it('asks for the website and limits, with the default limits', () => {
      renderNewModal();

      expect(screen.getByTestId('webCrawlScheduleModal')).toHaveTextContent(
        'Creates a workflow that crawls a website on this interval'
      );
      expect(screen.getByText('Website')).toBeInTheDocument();
      expect(getUrlInput()).toHaveValue('');
      expect(screen.getByTestId('webCrawlScheduleMaxDepth')).toHaveValue(2);
      expect(screen.getByTestId('webCrawlScheduleMaxDocuments')).toHaveValue(500);
    });

    it('does not ask for them when repeating a crawl', () => {
      renderModal();

      expect(screen.queryByTestId('webCrawlScheduleUrl')).not.toBeInTheDocument();
      expect(screen.queryByTestId('webCrawlScheduleMaxDepth')).not.toBeInTheDocument();
      expect(screen.queryByTestId('webCrawlScheduleMaxDocuments')).not.toBeInTheDocument();
    });

    it('cannot be confirmed until the website is a crawlable URL', () => {
      renderNewModal();

      expect(getConfirmButton()).toBeDisabled();
      expect(screen.queryByText(INVALID_URL_MESSAGE)).not.toBeInTheDocument();

      setUrl('ftp://example.com');
      fireEvent.blur(getUrlInput());

      expect(getConfirmButton()).toBeDisabled();
      expect(screen.getByText(INVALID_URL_MESSAGE)).toBeInTheDocument();

      setUrl('https://example.com');

      expect(getConfirmButton()).toBeEnabled();
      expect(screen.queryByText(INVALID_URL_MESSAGE)).not.toBeInTheDocument();
    });

    it.each([
      ['webCrawlScheduleMaxDepth', '6', 'Enter a whole number from 0 to 5.'],
      ['webCrawlScheduleMaxDepth', '1.5', 'Enter a whole number from 0 to 5.'],
      ['webCrawlScheduleMaxDocuments', '0', 'Enter a whole number from 1 to 1000.'],
      ['webCrawlScheduleMaxDocuments', '1001', 'Enter a whole number from 1 to 1000.'],
      ['webCrawlScheduleMaxDocuments', '', 'Enter a whole number from 1 to 1000.'],
    ])('cannot be confirmed with %s set to "%s"', (testSubj, value, message) => {
      renderNewModal();
      setUrl('https://example.com');

      fireEvent.change(screen.getByTestId(testSubj), { target: { value } });

      expect(getConfirmButton()).toBeDisabled();
      expect(screen.getByText(message)).toBeInTheDocument();
    });

    it('confirms with the trimmed website, the limits and the interval the user entered', () => {
      renderNewModal();

      setUrl('  https://example.com/blog  ');
      fireEvent.change(screen.getByTestId('webCrawlScheduleMaxDepth'), { target: { value: '0' } });
      fireEvent.change(screen.getByTestId('webCrawlScheduleMaxDocuments'), {
        target: { value: '25' },
      });
      setEvery('6');
      fireEvent.change(getUnitSelect(), { target: { value: 'h' } });
      fireEvent.click(getConfirmButton());

      expect(onConfirm).toHaveBeenCalledTimes(1);
      expect(onConfirm).toHaveBeenCalledWith({
        url: 'https://example.com/blog',
        maxDepth: 0,
        maxDocuments: 25,
        every: 6,
        unit: 'h',
      });
    });
  });
});
