/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { fireEvent, screen, within } from '@testing-library/react';
import { renderWithKibanaRenderContext } from '@kbn/test-jest-helpers';
import type { Investigation } from '../../types';
import { ConversationQueue } from './conversation_queue';

const investigation: Investigation = {
  id: 'inv-1',
  template_id: 'investigation',
  title: 'Impossible travel — exec account',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  watch_id: 'watch-1',
  watch_execution_id: 'exec-1',
  pendingProposalCount: 1,
  recommendedAction: 'respond',
  events: [],
};

const queueElement = (props: Partial<React.ComponentProps<typeof ConversationQueue>> = {}) => (
  <ConversationQueue
    briefingType="respond"
    briefingList={[investigation]}
    isOpen
    onToggle={jest.fn()}
    onClickAction={jest.fn()}
    onClickCard={jest.fn()}
    onOpenChat={jest.fn()}
    onClickRecommendedAction={jest.fn()}
    {...props}
  />
);

const renderQueue = (props: Partial<React.ComponentProps<typeof ConversationQueue>> = {}) =>
  renderWithKibanaRenderContext(queueElement(props));

const trigger = () => screen.getByRole('button', { name: /Respond/ });

describe('ConversationQueue', () => {
  it('counts the whole bucket, not the rows it was given', () => {
    renderQueue({ count: 42 });

    expect(trigger()).toHaveTextContent('42');
  });

  it('waits for a count rather than showing 0, which would read as empty', () => {
    renderQueue({ count: undefined });

    expect(trigger()).not.toHaveTextContent('0');
    expect(screen.getByLabelText('Loading count')).toBeInTheDocument();
  });

  it('renders nothing when closed with nothing ever loaded', () => {
    renderQueue({ isOpen: false, briefingList: [] });

    expect(screen.queryByText(investigation.title)).not.toBeInTheDocument();
    expect(screen.queryByText('No events in this category.')).not.toBeInTheDocument();
  });

  it('holds the last rows through a collapse, so the empty copy cannot flash', () => {
    // Mirrors the caller: collapsing drops its query to a count-only read, so the rows
    // empty on the same frame `isOpen` goes false.
    const Collapsing = () => {
      const [isOpen, setIsOpen] = useState(true);
      return queueElement({
        isOpen,
        briefingList: isOpen ? [investigation] : [],
        count: 1,
        onToggle: setIsOpen,
      });
    };

    renderWithKibanaRenderContext(<Collapsing />);
    expect(screen.getByText(investigation.title)).toBeInTheDocument();

    fireEvent.click(trigger());

    expect(screen.getByText(investigation.title)).toBeInTheDocument();
    expect(screen.queryByText('No events in this category.')).not.toBeInTheDocument();
  });

  it('shows the empty state once an open section really is empty', () => {
    renderQueue({ isOpen: true, briefingList: [], count: 0 });

    expect(screen.getByText('No events in this category.')).toBeInTheDocument();
  });

  it('reports a toggle so the caller can drive its fetch', () => {
    const onToggle = jest.fn();
    renderQueue({ isOpen: false, onToggle });

    fireEvent.click(trigger());

    expect(onToggle).toHaveBeenCalledWith(true);
  });

  it('scaffolds one placeholder per incoming row rather than a single spinner', () => {
    renderQueue({ loadingRows: 4, briefingList: [] });

    const scaffold = screen.getByLabelText('Loading events…');
    expect(scaffold).toBeInTheDocument();
    expect(within(scaffold).getAllByRole('progressbar')).toHaveLength(8);
  });

  it('shows neither rows nor the empty state while the scaffold is up', () => {
    renderQueue({ loadingRows: 2, briefingList: [investigation] });

    expect(screen.queryByText(investigation.title)).not.toBeInTheDocument();
    expect(screen.queryByText('No events in this category.')).not.toBeInTheDocument();
  });
});
