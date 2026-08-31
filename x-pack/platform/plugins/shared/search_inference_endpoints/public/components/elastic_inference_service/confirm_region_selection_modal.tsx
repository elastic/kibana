/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiCheckbox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { CspRegion } from '../../../common/types';
import type { PolicyMode, RegionPolicyConflictArtifact } from '../../types';
import { ConfirmRegionSelectionTabs } from './confirm_region_selection_tabs';

export interface ConfirmRegionSelectionModalProps {
  mode: PolicyMode;
  selectedRegions: CspRegion[];
  selectedGeos: string[];
  conflictArtifacts?: RegionPolicyConflictArtifact[];
  onConfirm: (force: boolean) => void;
  onCancel: () => void;
  isSaving: boolean;
}

export const ConfirmRegionSelectionModal: React.FC<ConfirmRegionSelectionModalProps> = ({
  mode,
  selectedRegions,
  selectedGeos,
  conflictArtifacts,
  onConfirm,
  onCancel,
  isSaving,
}) => {
  const modalTitleId = useGeneratedHtmlId();
  const ignoreCheckboxId = useGeneratedHtmlId({ prefix: 'confirmRegionSelectionIgnore' });
  const { euiTheme } = useEuiTheme();
  const [ignoreErrors, setIgnoreErrors] = useState(false);

  const hasConflict = Boolean(conflictArtifacts?.length);
  const unresolvedConflict = hasConflict && !ignoreErrors;
  const isConfirmSaveDisabled = isSaving || unresolvedConflict;
  const isIgnoreCheckboxDisabled = !hasConflict || isSaving;
  const isGeoMode = mode === 'geo';

  useEffect(() => {
    if (hasConflict) {
      return;
    }
    setIgnoreErrors(false);
  }, [hasConflict]);

  const handleConfirm = useCallback(() => {
    onConfirm(ignoreErrors);
  }, [ignoreErrors, onConfirm]);

  return (
    <EuiModal
      onClose={onCancel}
      aria-labelledby={modalTitleId}
      maxWidth={euiTheme.base * 45}
      data-test-subj="confirmRegionSelectionModal"
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle id={modalTitleId}>
          {i18n.translate('xpack.searchInferenceEndpoints.confirmRegionSelection.modalTitle', {
            defaultMessage: 'Confirm region selection',
          })}
        </EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        <EuiText size="s">
          <p>
            {isGeoMode
              ? i18n.translate(
                  'xpack.searchInferenceEndpoints.confirmRegionSelection.policyUpdateGeoDescription',
                  {
                    defaultMessage:
                      'Your region policy will be updated to only allow from the selected geography. This will apply to all spaces in your project.',
                  }
                )
              : i18n.translate(
                  'xpack.searchInferenceEndpoints.confirmRegionSelection.policyUpdateRegionDescription',
                  {
                    defaultMessage:
                      'Your region policy will be updated to only allow from the selected region. This will apply to all spaces in your project.',
                  }
                )}
          </p>
        </EuiText>

        {hasConflict && (
          <>
            <EuiSpacer size="m" />
            <EuiCallOut
              announceOnMount
              title={i18n.translate(
                'xpack.searchInferenceEndpoints.confirmRegionSelection.conflictCalloutTitle',
                {
                  defaultMessage: 'Policy could not be saved · Review affected inference endpoints',
                }
              )}
              color="danger"
              iconType="error"
              data-test-subj="confirmRegionSelectionCallout"
              text={i18n.translate(
                'xpack.searchInferenceEndpoints.confirmRegionSelection.conflictCalloutDescription',
                {
                  defaultMessage:
                    'Saving with errors ignored may cause ingest or index operations to fail.',
                }
              )}
            />
          </>
        )}

        <EuiSpacer size="m" />

        <EuiTitle size="xs">
          <h3 data-test-subj="confirmRegionSelectionReviewChangesTitle">
            {i18n.translate(
              'xpack.searchInferenceEndpoints.confirmRegionSelection.reviewChangesTitle',
              { defaultMessage: 'Review changes' }
            )}
          </h3>
        </EuiTitle>

        <EuiSpacer size="m" />

        <ConfirmRegionSelectionTabs
          mode={mode}
          selectedRegions={selectedRegions}
          selectedGeos={selectedGeos}
          conflictArtifacts={conflictArtifacts}
        />
      </EuiModalBody>

      <EuiModalFooter>
        <EuiFlexGroup direction="column" gutterSize="m" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiCheckbox
              id={ignoreCheckboxId}
              checked={ignoreErrors}
              disabled={isIgnoreCheckboxDisabled}
              onChange={(e) => setIgnoreErrors(e.target.checked)}
              label={
                <>
                  {i18n.translate(
                    'xpack.searchInferenceEndpoints.confirmRegionSelection.ignoreErrorsLabel',
                    {
                      defaultMessage: 'Ignore inference endpoint errors with affected models',
                    }
                  )}
                  <EuiText size="xs" color="subdued">
                    <p>
                      {i18n.translate(
                        'xpack.searchInferenceEndpoints.confirmRegionSelection.ignoreErrorsDescription',
                        {
                          defaultMessage:
                            'Endpoints for models outside of the selected locations will cause ingest or index operations to fail.',
                        }
                      )}
                    </p>
                  </EuiText>
                </>
              }
              data-test-subj="confirmRegionSelectionIgnoreCheckbox"
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup justifyContent="flexEnd" gutterSize="m" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  onClick={onCancel}
                  isDisabled={isSaving}
                  data-test-subj="confirmRegionSelectionCancelButton"
                >
                  {i18n.translate(
                    'xpack.searchInferenceEndpoints.confirmRegionSelection.cancelButtonLabel',
                    { defaultMessage: 'Cancel' }
                  )}
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  fill
                  onClick={handleConfirm}
                  isDisabled={isConfirmSaveDisabled}
                  isLoading={isSaving}
                  data-test-subj="confirmRegionSelectionSaveButton"
                >
                  {i18n.translate(
                    'xpack.searchInferenceEndpoints.confirmRegionSelection.saveButtonLabel',
                    { defaultMessage: 'Save policy' }
                  )}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiModalFooter>
    </EuiModal>
  );
};
