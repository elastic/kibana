/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { createFleetTestRendererMock } from '../../../../../../mock';

import { AgentsSelectionStatus } from './agents_selection_status';

function render(props: any) {
  const renderer = createFleetTestRendererMock();

  return renderer.render(<AgentsSelectionStatus {...props} />);
}

const defaultProps = {
  totalAgents: 30,
  selectableAgents: 20,
  managedAgentsOnCurrentPage: 0,
  selectionMode: 'manual',
  setSelectionMode: jest.fn(),
  selectedAgents: [],
  setSelectedAgents: jest.fn(),
};

function generateAgents(n: number) {
  return [...Array(n).keys()].map((i) => ({
    id: `agent${i}`,
    active: true,
  }));
}

describe('AgentsSelectionStatus', () => {
  describe('when selection mode is manual', () => {
    describe('when there are no selected agents', () => {
      it('should not show any selection options', () => {
        const res = render(defaultProps);
        expect(res.queryByTestId('selectedAgentCountLabel')).toBeNull();
        expect(res.queryByTestId('clearAgentSelectionButton')).toBeNull();
        expect(res.queryByTestId('selectedEverythingOnAllPagesButton')).toBeNull();
      });
    });

    describe('when there are selected agents', () => {
      it('should show the number of selected agents and the Clear selection button', () => {
        const res = render({ ...defaultProps, selectedAgents: generateAgents(2) });
        expect(res.queryByTestId('selectedAgentCountLabel')).not.toBeNull();
        expect(res.queryByTestId('clearAgentSelectionButton')).not.toBeNull();
      });

      it('should not show the Select everything on all pages button if not all agents are selected', () => {
        const res = render({ ...defaultProps, selectedAgents: generateAgents(2) });
        expect(res.queryByTestId('selectedEverythingOnAllPagesButton')).toBeNull();
      });

      it('should not show the Select everything on all pages button if all agents are selected but there are no more selectable agents', () => {
        const res = render({
          ...defaultProps,
          totalAgents: 20,
          selectableAgents: 19,
          managedAgentsOnCurrentPage: 1,
          selectedAgents: generateAgents(19),
        });
        expect(res.queryByTestId('selectedEverythingOnAllPagesButton')).toBeNull();
      });

      it('should show the Select everything on all pages button if all agents are selected and there are more selectable agents', () => {
        const res = render({ ...defaultProps, selectedAgents: generateAgents(20) });
        expect(res.queryByTestId('selectedEverythingOnAllPagesButton')).not.toBeNull();
      });
    });
  });

  describe('when selection mode is query', () => {
    describe('when there are agents', () => {
      it('should show the number of selected agents and the Clear selection button', () => {
        const res = render({
          ...defaultProps,
          selectionMode: 'query',
          selectedAgents: generateAgents(2),
        });
        expect(res.queryByTestId('selectedAgentCountLabel')).not.toBeNull();
        expect(res.queryByTestId('clearAgentSelectionButton')).not.toBeNull();
      });

      it('should not show the Select everything on all pages button', () => {
        const res = render({
          ...defaultProps,
          selectionMode: 'query',
          selectedAgents: generateAgents(20),
        });
        expect(res.queryByTestId('selectedEverythingOnAllPagesButton')).toBeNull();
      });
    });
  });
});
