/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiConfirmModal, EuiSpacer, EuiText, useGeneratedHtmlId } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { getGeoDisplayName, getRegionDisplayName, regionKey } from '../../utils/eis_utils';
import type { CspRegion } from '../../../common/types';
import type { PolicyMode } from '../../types';

export interface ConfirmRegionChangeModalProps {
  mode: PolicyMode;
  selectedRegions: CspRegion[];
  selectedGeos: string[];
  onConfirm: () => void;
  onCancel: () => void;
  isSaving: boolean;
}

export const ConfirmRegionChangeModal: React.FC<ConfirmRegionChangeModalProps> = ({
  mode,
  selectedRegions,
  selectedGeos,
  onConfirm,
  onCancel,
  isSaving,
}) => {
  const modalTitleId = useGeneratedHtmlId();
  const isGeoMode = mode === 'geo';

  const title = isGeoMode
    ? i18n.translate('xpack.searchInferenceEndpoints.manageRegions.confirmModal.titleGeo', {
        defaultMessage: 'Confirm geographies change',
      })
    : i18n.translate('xpack.searchInferenceEndpoints.manageRegions.confirmModal.titleRegions', {
        defaultMessage: 'Confirm region change',
      });

  return (
    <EuiConfirmModal
      aria-labelledby={modalTitleId}
      titleProps={{ id: modalTitleId }}
      title={title}
      onCancel={onCancel}
      onConfirm={onConfirm}
      cancelButtonText={i18n.translate(
        'xpack.searchInferenceEndpoints.manageRegions.confirmModal.cancelButtonLabel',
        { defaultMessage: 'Cancel' }
      )}
      confirmButtonText={i18n.translate(
        'xpack.searchInferenceEndpoints.manageRegions.confirmModal.saveButtonLabel',
        { defaultMessage: 'Save' }
      )}
      buttonColor="primary"
      defaultFocusedButton="confirm"
      isLoading={isSaving}
      confirmButtonDisabled={isSaving}
      data-test-subj="confirmRegionChangeModal"
    >
      <EuiText size="s">
        <p>
          {i18n.translate('xpack.searchInferenceEndpoints.manageRegions.confirmModal.body', {
            defaultMessage:
              'Changing your region policy will affect all Elastic Inference Service endpoints across all spaces.',
          })}
        </p>
      </EuiText>

      <EuiSpacer size="s" />

      <EuiText size="s">
        <p>
          <strong>
            {isGeoMode
              ? i18n.translate(
                  'xpack.searchInferenceEndpoints.manageRegions.confirmModal.pendingGeos',
                  { defaultMessage: 'Your pending allowed geographies:' }
                )
              : i18n.translate(
                  'xpack.searchInferenceEndpoints.manageRegions.confirmModal.pendingRegions',
                  { defaultMessage: 'Your pending allowed regions:' }
                )}
          </strong>
        </p>
        {isGeoMode ? (
          <ul data-test-subj="confirmModalGeoList">
            {selectedGeos.map((geo) => (
              <li key={geo}>{getGeoDisplayName(geo)}</li>
            ))}
          </ul>
        ) : (
          <ul data-test-subj="confirmModalRegionList">
            {selectedRegions.map((r) => (
              <li key={regionKey(r)}>{getRegionDisplayName(r)}</li>
            ))}
          </ul>
        )}
      </EuiText>
    </EuiConfirmModal>
  );
};
