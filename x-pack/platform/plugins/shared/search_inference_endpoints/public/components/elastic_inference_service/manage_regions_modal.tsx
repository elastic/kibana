/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSpacer,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { UseEuiTheme } from '@elastic/eui';
import { useRegionPolicy, useSaveRegionPolicy } from '../../hooks/use_region_policy';
import { useEisModels } from '../../hooks/use_eis_models';
import {
  getAvailableRegions,
  getGeoDisplayName,
  GEO_ORDER,
  regionKey,
} from '../../utils/eis_utils';
import { RegionZoneList } from './region_zone_list';
import type { ZoneGroup } from './region_zone_list';

interface ManageRegionsModalProps {
  onClose: () => void;
}

const modalStyles = ({ euiTheme }: UseEuiTheme) => css`
  min-width: ${euiTheme.base * 35}px;
`;

export const ManageRegionsModal: React.FC<ManageRegionsModalProps> = ({ onClose }) => {
  const modalTitleId = useGeneratedHtmlId();

  const { data: policy, isLoading: isPolicyLoading, isError: isPolicyError } = useRegionPolicy();
  const {
    data: eisEndpoints,
    isLoading: isEndpointsLoading,
    isError: isEndpointsError,
  } = useEisModels();
  const { mutate: savePolicy, isLoading: isSaving } = useSaveRegionPolicy();

  const availableRegions = useMemo(() => getAvailableRegions(eisEndpoints ?? []), [eisEndpoints]);

  const [checkedKeys, setCheckedKeys] = useState<Set<string>>(new Set());
  const [syncedFromPolicy, setSyncedFromPolicy] = useState(false);
  const [expandedZones, setExpandedZones] = useState<Set<string>>(new Set());
  const [isCallOutDismissed, setIsCallOutDismissed] = useState(false);

  React.useEffect(() => {
    if (!isPolicyLoading && !isEndpointsLoading && !syncedFromPolicy) {
      const existing = policy?.region_policy?.allowed_regions ?? [];
      if (existing.length > 0) {
        setCheckedKeys(new Set(existing.map(regionKey)));
      } else {
        setCheckedKeys(new Set(availableRegions.map(regionKey)));
      }
      setSyncedFromPolicy(true);
    }
  }, [isPolicyLoading, isEndpointsLoading, syncedFromPolicy, policy, availableRegions]);

  const zoneGroups = useMemo((): ZoneGroup[] => {
    const byGeo = new Map<string, typeof availableRegions>();
    for (const r of availableRegions) {
      const geo = r.geo ?? 'other';
      const list = byGeo.get(geo) ?? [];
      list.push(r);
      byGeo.set(geo, list);
    }
    return [...GEO_ORDER]
      .filter((geo) => byGeo.has(geo))
      .map((geo) => ({
        geo,
        displayName: getGeoDisplayName(geo),
        regions: byGeo.get(geo)!,
      }));
  }, [availableRegions]);

  const totalSelected = checkedKeys.size;
  const totalRegions = availableRegions.length;
  const allSelected = totalSelected === totalRegions;

  const handleSelectAll = useCallback(() => {
    if (allSelected) {
      setCheckedKeys(new Set());
    } else {
      setCheckedKeys(new Set(availableRegions.map(regionKey)));
    }
  }, [allSelected, availableRegions]);

  const handleToggleRegion = useCallback((key: string) => {
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

  const handleToggleZone = useCallback(
    (zone: ZoneGroup) => {
      const zoneKeys = zone.regions.map(regionKey);
      const allZoneChecked = zoneKeys.every((k) => checkedKeys.has(k));
      setCheckedKeys((prev) => {
        const next = new Set(prev);
        if (allZoneChecked) {
          zoneKeys.forEach((k) => next.delete(k));
        } else {
          zoneKeys.forEach((k) => next.add(k));
        }
        return next;
      });
    },
    [checkedKeys]
  );

  const handleToggleExpand = useCallback((zoneId: string) => {
    setExpandedZones((prev) => {
      const next = new Set(prev);
      if (next.has(zoneId)) {
        next.delete(zoneId);
      } else {
        next.add(zoneId);
      }
      return next;
    });
  }, []);

  const handleExpandAll = useCallback(() => {
    if (expandedZones.size === zoneGroups.length) {
      setExpandedZones(new Set());
    } else {
      setExpandedZones(new Set(zoneGroups.map((z) => z.geo)));
    }
  }, [expandedZones.size, zoneGroups]);

  const handleResetToDefault = useCallback(() => {
    setCheckedKeys(new Set(availableRegions.map(regionKey)));
  }, [availableRegions]);

  const handleSave = useCallback(() => {
    const allowedRegions = availableRegions
      .filter((r) => checkedKeys.has(regionKey(r)))
      .map(({ csp, region }) => ({ csp, region }));

    savePolicy({ allowed_regions: allowedRegions }, { onSuccess: onClose });
  }, [availableRegions, checkedKeys, savePolicy, onClose]);

  const isLoading = isPolicyLoading || isEndpointsLoading;
  const isError = isPolicyError || isEndpointsError;
  const isAllExpanded = expandedZones.size === zoneGroups.length;

  return (
    <EuiModal
      css={modalStyles}
      onClose={onClose}
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
        {isError && (
          <>
            <EuiCallOut
              announceOnMount={false}
              title={i18n.translate(
                'xpack.searchInferenceEndpoints.manageRegions.errorCallout.title',
                { defaultMessage: 'Failed to load region data' }
              )}
              color="danger"
              iconType="error"
              data-test-subj="manageRegionsErrorCallout"
            >
              <p>
                {i18n.translate('xpack.searchInferenceEndpoints.manageRegions.errorCallout.body', {
                  defaultMessage:
                    'An error occurred while fetching region or policy data. Close and reopen this panel to retry.',
                })}
              </p>
            </EuiCallOut>
            <EuiSpacer size="m" />
          </>
        )}
        <EuiText size="s">
          <p>
            <FormattedMessage
              id="xpack.searchInferenceEndpoints.manageRegions.description"
              defaultMessage="You can restrict the routing of inference calls by specifying only those regions."
            />
          </p>
        </EuiText>

        <EuiSpacer size="m" />

        {!isCallOutDismissed && (
          <>
            <EuiCallOut
              title={i18n.translate('xpack.searchInferenceEndpoints.manageRegions.callout.title', {
                defaultMessage: 'All models may not be available in all regions',
              })}
              color="primary"
              iconType="info"
              announceOnMount={false}
              onDismiss={() => setIsCallOutDismissed(true)}
              data-test-subj="manageRegionsCallout"
            >
              <p>
                {i18n.translate('xpack.searchInferenceEndpoints.manageRegions.callout.body', {
                  defaultMessage:
                    "Some models are only hosted in specific regions. Restricting your selection may make those models unavailable for inference routing. Check each model's details to see its supported regions.",
                })}
              </p>
            </EuiCallOut>
            <EuiSpacer size="m" />
          </>
        )}

        {isLoading && (
          <EuiEmptyPrompt
            icon={<EuiLoadingSpinner size="xl" />}
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
          <>
            {/* Selection summary + Expand all / Reset to default */}
            <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" gutterSize="s">
              <EuiFlexItem grow={false}>
                <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
                  <EuiFlexItem grow={false}>
                    <EuiText size="s">
                      <strong>
                        {i18n.translate(
                          'xpack.searchInferenceEndpoints.manageRegions.selectionCount',
                          {
                            defaultMessage: '{selected} of {total} selected',
                            values: { selected: totalSelected, total: totalRegions },
                          }
                        )}
                      </strong>
                    </EuiText>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiButtonEmpty
                      size="xs"
                      flush="left"
                      onClick={handleSelectAll}
                      data-test-subj="manageRegionsSelectAllButton"
                    >
                      {allSelected
                        ? i18n.translate(
                            'xpack.searchInferenceEndpoints.manageRegions.deselectAll',
                            { defaultMessage: 'Deselect all' }
                          )
                        : i18n.translate('xpack.searchInferenceEndpoints.manageRegions.selectAll', {
                            defaultMessage: 'Select all',
                          })}
                    </EuiButtonEmpty>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>

              <EuiFlexItem grow={false}>
                <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                  <EuiFlexItem grow={false}>
                    <EuiButtonEmpty
                      size="xs"
                      onClick={handleExpandAll}
                      data-test-subj="manageRegionsExpandAllButton"
                    >
                      {isAllExpanded
                        ? i18n.translate(
                            'xpack.searchInferenceEndpoints.manageRegions.collapseAll',
                            { defaultMessage: 'Collapse all' }
                          )
                        : i18n.translate('xpack.searchInferenceEndpoints.manageRegions.expandAll', {
                            defaultMessage: 'Expand all',
                          })}
                    </EuiButtonEmpty>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiButtonEmpty
                      size="xs"
                      iconType="refresh"
                      onClick={handleResetToDefault}
                      data-test-subj="manageRegionsResetButton"
                    >
                      {i18n.translate(
                        'xpack.searchInferenceEndpoints.manageRegions.resetToDefault',
                        { defaultMessage: 'Reset to default' }
                      )}
                    </EuiButtonEmpty>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
            </EuiFlexGroup>

            <EuiSpacer size="s" />

            <RegionZoneList
              zoneGroups={zoneGroups}
              checkedKeys={checkedKeys}
              expandedZones={expandedZones}
              onToggleRegion={handleToggleRegion}
              onToggleZone={handleToggleZone}
              onToggleExpand={handleToggleExpand}
            />
          </>
        )}
      </EuiModalBody>

      <EuiModalFooter>
        <EuiButtonEmpty
          onClick={onClose}
          isDisabled={isSaving}
          data-test-subj="manageRegionsCancelButton"
        >
          {i18n.translate('xpack.searchInferenceEndpoints.manageRegions.cancel', {
            defaultMessage: 'Cancel',
          })}
        </EuiButtonEmpty>

        <EuiButton
          fill
          onClick={handleSave}
          isDisabled={isSaving || isLoading || totalSelected === 0}
          isLoading={isSaving}
          data-test-subj="manageRegionsSaveButton"
        >
          {i18n.translate('xpack.searchInferenceEndpoints.manageRegions.save', {
            defaultMessage: 'Save preferences',
          })}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
