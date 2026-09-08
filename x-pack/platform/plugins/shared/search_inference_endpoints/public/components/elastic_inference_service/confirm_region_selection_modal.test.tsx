/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { EuiThemeProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { ConfirmRegionSelectionModal } from './confirm_region_selection_modal';
import type { RegionPolicyConflictArtifact } from '../../types';

const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <EuiThemeProvider>
    <I18nProvider>{children}</I18nProvider>
  </EuiThemeProvider>
);

const selectedRegions = [
  { csp: 'aws', region: 'us-east-1', geo: 'us' },
  { csp: 'gcp', region: 'europe-west1', geo: 'eu' },
];

const conflictArtifacts: RegionPolicyConflictArtifact[] = [
  {
    type: 'index',
    name: 'region-policy-force-test-index',
    endpointIds: ['.elser-2-elastic'],
  },
  {
    type: 'pipeline',
    name: 'region-policy-force-test',
    endpointIds: ['.elser-2-elastic'],
  },
  {
    type: 'index',
    name: '.integration_knowledge-7',
    endpointIds: ['.jina-embeddings-v5-text-small'],
  },
];

describe('ConfirmRegionSelectionModal', () => {
  const onConfirm = jest.fn();
  const onCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('without conflict', () => {
    it('renders the selected regions list in regions mode', () => {
      render(
        <Wrapper>
          <ConfirmRegionSelectionModal
            mode="regions"
            selectedRegions={selectedRegions}
            selectedGeos={['eu']}
            onConfirm={onConfirm}
            onCancel={onCancel}
            isSaving={false}
          />
        </Wrapper>
      );

      expect(screen.getByTestId('confirmRegionSelectionModal')).toHaveTextContent(
        'Confirm region selection'
      );
      expect(screen.getByTestId('confirmRegionSelectionSelectedTab')).toHaveTextContent(
        'Selected region'
      );
      expect(screen.getByTestId('confirmRegionSelectionSelectedBadge')).toHaveTextContent('2');
      expect(screen.getByTestId('confirmRegionSelectionReviewChangesTitle')).toHaveTextContent(
        'Review changes'
      );
      expect(screen.getByTestId('confirmRegionSelectionModal')).toHaveTextContent(
        'selected region'
      );
      const list = screen.getByTestId('confirmRegionSelectionRegionList');
      expect(list.querySelectorAll('li')).toHaveLength(selectedRegions.length);
      expect(screen.queryByTestId('confirmRegionSelectionGeoList')).not.toBeInTheDocument();
      expect(screen.queryByTestId('confirmRegionSelectionCallout')).not.toBeInTheDocument();
    });

    it('renders the selected geos list in geo mode', () => {
      render(
        <Wrapper>
          <ConfirmRegionSelectionModal
            mode="geo"
            selectedRegions={selectedRegions}
            selectedGeos={['eu', 'us']}
            onConfirm={onConfirm}
            onCancel={onCancel}
            isSaving={false}
          />
        </Wrapper>
      );

      expect(screen.getByTestId('confirmRegionSelectionSelectedTab')).toHaveTextContent(
        'Selected geography'
      );
      expect(screen.getByTestId('confirmRegionSelectionSelectedBadge')).toHaveTextContent('2');
      expect(screen.getByTestId('confirmRegionSelectionModal')).toHaveTextContent(
        'selected geography'
      );
      expect(screen.getByTestId('confirmRegionSelectionGeoList')).toBeInTheDocument();
      expect(screen.queryByTestId('confirmRegionSelectionRegionList')).not.toBeInTheDocument();
    });

    it('calls onConfirm(false) when Save policy is clicked', () => {
      render(
        <Wrapper>
          <ConfirmRegionSelectionModal
            mode="geo"
            selectedRegions={[]}
            selectedGeos={['eu']}
            onConfirm={onConfirm}
            onCancel={onCancel}
            isSaving={false}
          />
        </Wrapper>
      );

      fireEvent.click(screen.getByTestId('confirmRegionSelectionSaveButton'));
      expect(onConfirm).toHaveBeenCalledWith(false);
    });

    it('calls onCancel when Cancel is clicked', () => {
      render(
        <Wrapper>
          <ConfirmRegionSelectionModal
            mode="geo"
            selectedRegions={[]}
            selectedGeos={['eu']}
            onConfirm={onConfirm}
            onCancel={onCancel}
            isSaving={false}
          />
        </Wrapper>
      );

      fireEvent.click(screen.getByTestId('confirmRegionSelectionCancelButton'));
      expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it('disables the ignore-errors checkbox when there is no conflict', () => {
      render(
        <Wrapper>
          <ConfirmRegionSelectionModal
            mode="geo"
            selectedRegions={[]}
            selectedGeos={['eu']}
            onConfirm={onConfirm}
            onCancel={onCancel}
            isSaving={false}
          />
        </Wrapper>
      );

      expect(screen.getByTestId('confirmRegionSelectionIgnoreCheckbox')).toBeDisabled();
    });

    it('disables the Issues tab when there is no conflict', () => {
      render(
        <Wrapper>
          <ConfirmRegionSelectionModal
            mode="geo"
            selectedRegions={[]}
            selectedGeos={['eu']}
            onConfirm={onConfirm}
            onCancel={onCancel}
            isSaving={false}
          />
        </Wrapper>
      );

      expect(screen.getByTestId('confirmRegionSelectionIssuesTab')).toBeDisabled();
    });
  });

  describe('with conflict', () => {
    it('shows the callout, issues badge, and one row per artifact', async () => {
      render(
        <Wrapper>
          <ConfirmRegionSelectionModal
            mode="geo"
            selectedRegions={[]}
            selectedGeos={['eu']}
            conflictArtifacts={conflictArtifacts}
            onConfirm={onConfirm}
            onCancel={onCancel}
            isSaving={false}
          />
        </Wrapper>
      );

      expect(screen.getByTestId('confirmRegionSelectionCallout')).toHaveTextContent(
        'Policy could not be saved · Review affected inference endpoints'
      );
      expect(screen.getByTestId('confirmRegionSelectionCallout')).toHaveTextContent(
        'Saving with errors ignored'
      );

      await waitFor(() => {
        expect(screen.getByTestId('confirmRegionSelectionIssue-0')).toBeInTheDocument();
      });

      expect(screen.getByTestId('confirmRegionSelectionIssuesBadge')).toHaveTextContent('3');
      expect(screen.getByTestId('confirmRegionSelectionIssue-0')).toHaveTextContent(
        'region-policy-force-test-index'
      );
      expect(screen.getByTestId('confirmRegionSelectionIssueType-0')).toHaveTextContent('Index');
      expect(screen.getByTestId('confirmRegionSelectionIssueEndpoints-0')).toHaveTextContent(
        '.elser-2-elastic'
      );
      expect(screen.getByTestId('confirmRegionSelectionIssueType-1')).toHaveTextContent('Pipeline');
      expect(screen.getByTestId('confirmRegionSelectionIssue-2')).toHaveTextContent(
        '.integration_knowledge-7'
      );
    });

    it('keeps Save policy disabled until the ignore-errors checkbox is checked', async () => {
      render(
        <Wrapper>
          <ConfirmRegionSelectionModal
            mode="geo"
            selectedRegions={[]}
            selectedGeos={['eu']}
            conflictArtifacts={conflictArtifacts}
            onConfirm={onConfirm}
            onCancel={onCancel}
            isSaving={false}
          />
        </Wrapper>
      );

      expect(screen.getByTestId('confirmRegionSelectionSaveButton')).toBeDisabled();

      fireEvent.click(screen.getByTestId('confirmRegionSelectionIgnoreCheckbox'));

      await waitFor(() => {
        expect(screen.getByTestId('confirmRegionSelectionSaveButton')).not.toBeDisabled();
      });

      fireEvent.click(screen.getByTestId('confirmRegionSelectionSaveButton'));
      expect(onConfirm).toHaveBeenCalledWith(true);
    });

    it('lists multiple denied endpoints as a comma-separated list', async () => {
      render(
        <Wrapper>
          <ConfirmRegionSelectionModal
            mode="geo"
            selectedRegions={[]}
            selectedGeos={['eu']}
            conflictArtifacts={[
              {
                type: 'index',
                name: 'search-national-parks',
                endpointIds: [
                  '.elser-2-elastic',
                  '.jina-embeddings-v5-text-small',
                  '.multilingual-e5-small',
                ],
              },
            ]}
            onConfirm={onConfirm}
            onCancel={onCancel}
            isSaving={false}
          />
        </Wrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('confirmRegionSelectionIssue-0')).toBeInTheDocument();
      });

      expect(screen.getByTestId('confirmRegionSelectionIssueEndpoints-0')).toHaveTextContent(
        '.elser-2-elastic, .jina-embeddings-v5-text-small, .multilingual-e5-small'
      );
    });

    it('still lists selected geos after switching back to the Selected geography tab', async () => {
      render(
        <Wrapper>
          <ConfirmRegionSelectionModal
            mode="geo"
            selectedRegions={[]}
            selectedGeos={['eu', 'us']}
            conflictArtifacts={conflictArtifacts}
            onConfirm={onConfirm}
            onCancel={onCancel}
            isSaving={false}
          />
        </Wrapper>
      );

      fireEvent.click(screen.getByTestId('confirmRegionSelectionSelectedTab'));

      await waitFor(() => {
        expect(screen.getByTestId('confirmRegionSelectionGeoList')).toBeInTheDocument();
      });
    });
  });

  it('disables Save and Cancel while saving', () => {
    render(
      <Wrapper>
        <ConfirmRegionSelectionModal
          mode="geo"
          selectedRegions={[]}
          selectedGeos={['eu']}
          onConfirm={onConfirm}
          onCancel={onCancel}
          isSaving
        />
      </Wrapper>
    );

    expect(screen.getByTestId('confirmRegionSelectionSaveButton')).toBeDisabled();
    expect(screen.getByTestId('confirmRegionSelectionCancelButton')).toBeDisabled();
  });
});
