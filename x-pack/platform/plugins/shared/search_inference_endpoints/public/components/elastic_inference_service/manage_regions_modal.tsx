/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiCheckbox,
  EuiEmptyPrompt,
  EuiLoadingSpinner,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSpacer,
  EuiText,
  EuiTreeView,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { CspRegion } from '../../../common/types';
import {
  useRegionPolicy,
  useSaveRegionPolicy,
  useDeleteRegionPolicy,
} from '../../hooks/use_region_policy';
import { useEisModels } from '../../hooks/use_eis_models';
import { getAvailableRegions, CSP_DISPLAY_NAMES } from '../../utils/eis_utils';

interface ManageRegionsModalProps {
  onClose: () => void;
}

const regionKey = (r: CspRegion) => `${r.csp}::${r.region}`;

export const ManageRegionsModal: React.FC<ManageRegionsModalProps> = ({ onClose }) => {
  const modalTitleId = useGeneratedHtmlId();

  const { data: policy, isLoading: isPolicyLoading } = useRegionPolicy();
  const { data: eisEndpoints, isLoading: isEndpointsLoading } = useEisModels();
  const { mutate: savePolicy, isLoading: isSaving } = useSaveRegionPolicy();
  const { mutate: deletePolicy, isLoading: isDeleting } = useDeleteRegionPolicy();

  const availableRegions = useMemo(() => getAvailableRegions(eisEndpoints ?? []), [eisEndpoints]);

  const [checkedKeys, setCheckedKeys] = useState<Set<string>>(new Set());
  const [syncedFromPolicy, setSyncedFromPolicy] = useState(false);

  // Seed checkbox state once the policy finishes loading
  React.useEffect(() => {
    if (!isPolicyLoading && !syncedFromPolicy) {
      const existing = policy?.region_policy?.allowed_regions ?? [];
      setCheckedKeys(new Set(existing.map(regionKey)));
      setSyncedFromPolicy(true);
    }
  }, [isPolicyLoading, syncedFromPolicy, policy]);

  const handleToggle = useCallback((key: string) => {
    setCheckedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const treeItems = useMemo(() => {
    const byCSP = new Map<string, CspRegion[]>();
    for (const r of availableRegions) {
      const list = byCSP.get(r.csp) ?? [];
      list.push(r);
      byCSP.set(r.csp, list);
    }

    return [...byCSP.entries()].map(([csp, regions]) => ({
      id: `csp-${csp}`,
      label: CSP_DISPLAY_NAMES[csp] ?? csp.toUpperCase(),
      children: regions.map((r) => {
        const key = regionKey(r);
        return {
          id: `region-${key}`,
          label: (
            <EuiCheckbox
              id={`manage-region-${key}`}
              label={r.region}
              checked={checkedKeys.has(key)}
              onChange={() => handleToggle(key)}
              data-test-subj={`manageRegionsCheckbox-${key}`}
            />
          ),
        };
      }),
    }));
  }, [availableRegions, checkedKeys, handleToggle]);

  const handleSave = useCallback(() => {
    const allowedRegions: CspRegion[] = availableRegions.filter((r) =>
      checkedKeys.has(regionKey(r))
    );
    savePolicy({ allowed_regions: allowedRegions }, { onSuccess: onClose });
  }, [availableRegions, checkedKeys, savePolicy, onClose]);

  const handleRemoveRestrictions = useCallback(() => {
    deletePolicy(undefined, { onSuccess: onClose });
  }, [deletePolicy, onClose]);

  const isLoading = isPolicyLoading || isEndpointsLoading;
  const isBusy = isSaving || isDeleting;

  return (
    <EuiModal
      onClose={onClose}
      style={{ minWidth: 520 }}
      aria-labelledby={modalTitleId}
      data-test-subj="manageRegionsModal"
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle id={modalTitleId}>
          {i18n.translate('xpack.searchInferenceEndpoints.manageRegions.title', {
            defaultMessage: 'Manage region preferences',
          })}
        </EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        <EuiText size="s">
          <p>
            <FormattedMessage
              id="xpack.searchInferenceEndpoints.manageRegions.description"
              defaultMessage="Select the regions where Elastic Inference Service models are allowed to run. Only models available in the selected regions will be accessible. Leave all unchecked to allow all available regions."
            />
          </p>
        </EuiText>

        <EuiSpacer size="m" />

        {isLoading && (
          <EuiEmptyPrompt
            icon={<EuiLoadingSpinner size="xl" />}
            title={
              <h3>
                {i18n.translate('xpack.searchInferenceEndpoints.manageRegions.loading', {
                  defaultMessage: 'Loading region data…',
                })}
              </h3>
            }
            data-test-subj="manageRegionsLoading"
          />
        )}

        {!isLoading && availableRegions.length === 0 && (
          <EuiCallOut
            announceOnMount
            title={i18n.translate('xpack.searchInferenceEndpoints.manageRegions.noRegions.title', {
              defaultMessage: 'No regions available',
            })}
            color="warning"
            iconType="warning"
            data-test-subj="manageRegionsNoRegions"
          >
            <p>
              {i18n.translate(
                'xpack.searchInferenceEndpoints.manageRegions.noRegions.description',
                {
                  defaultMessage:
                    'No region information is available for the current Elastic Inference Service endpoints.',
                }
              )}
            </p>
          </EuiCallOut>
        )}

        {!isLoading && availableRegions.length > 0 && (
          <EuiTreeView
            items={treeItems}
            expandByDefault
            showExpansionArrows
            aria-label={i18n.translate(
              'xpack.searchInferenceEndpoints.manageRegions.treeAriaLabel',
              { defaultMessage: 'Available regions' }
            )}
            data-test-subj="manageRegionsTree"
          />
        )}
      </EuiModalBody>

      <EuiModalFooter>
        <EuiButtonEmpty
          onClick={handleRemoveRestrictions}
          isDisabled={isBusy || isLoading}
          color="danger"
          data-test-subj="manageRegionsRemoveRestrictionsButton"
        >
          {i18n.translate('xpack.searchInferenceEndpoints.manageRegions.removeRestrictions', {
            defaultMessage: 'Remove restrictions',
          })}
        </EuiButtonEmpty>

        <EuiButtonEmpty
          onClick={onClose}
          isDisabled={isBusy}
          data-test-subj="manageRegionsCancelButton"
        >
          {i18n.translate('xpack.searchInferenceEndpoints.manageRegions.cancel', {
            defaultMessage: 'Cancel',
          })}
        </EuiButtonEmpty>

        <EuiButton
          fill
          onClick={handleSave}
          isDisabled={isBusy || isLoading}
          isLoading={isSaving}
          data-test-subj="manageRegionsSaveButton"
        >
          {i18n.translate('xpack.searchInferenceEndpoints.manageRegions.save', {
            defaultMessage: 'Save',
          })}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
