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
  EuiButtonIcon,
  EuiCallOut,
  EuiCheckbox,
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
  EuiToolTip,
  useEuiTheme,
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
import {
  getAvailableRegions,
  GEO_TO_ZONE,
  ZONE_DISPLAY_NAMES,
  ZONE_ORDER,
} from '../../utils/eis_utils';

interface ManageRegionsModalProps {
  onClose: () => void;
}

const regionKey = (r: CspRegion) => `${r.csp}::${r.region}`;

interface ZoneGroup {
  zoneId: string;
  displayName: string;
  regions: CspRegion[];
}

export const ManageRegionsModal: React.FC<ManageRegionsModalProps> = ({ onClose }) => {
  const { euiTheme } = useEuiTheme();
  const modalTitleId = useGeneratedHtmlId();

  const { data: policy, isLoading: isPolicyLoading } = useRegionPolicy();
  const { data: eisEndpoints, isLoading: isEndpointsLoading } = useEisModels();
  const { mutate: savePolicy, isLoading: isSaving } = useSaveRegionPolicy();
  const { mutate: deletePolicy, isLoading: isDeleting } = useDeleteRegionPolicy();

  const availableRegions = useMemo(() => getAvailableRegions(eisEndpoints ?? []), [eisEndpoints]);

  const [checkedKeys, setCheckedKeys] = useState<Set<string>>(new Set());
  const [syncedFromPolicy, setSyncedFromPolicy] = useState(false);
  const [expandedZones, setExpandedZones] = useState<Set<string>>(new Set());
  const [isCallOutDismissed, setIsCallOutDismissed] = useState(false);

  // Seed checkbox state once the policy finishes loading.
  // No policy (null/empty allowed_regions) means no restrictions — all regions selected.
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
    const byZone = new Map<string, CspRegion[]>();
    for (const r of availableRegions) {
      const key = regionKey(r);
      const zoneId = (r.geo ? GEO_TO_ZONE[r.geo] : undefined) ?? 'other';
      const list = byZone.get(zoneId) ?? [];
      list.push(r);
      byZone.set(zoneId, list);
    }
    return [...ZONE_ORDER]
      .filter((z) => byZone.has(z))
      .map((zoneId) => ({
        zoneId,
        displayName: ZONE_DISPLAY_NAMES[zoneId] ?? zoneId,
        regions: byZone.get(zoneId)!,
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
      setExpandedZones(new Set(zoneGroups.map((z) => z.zoneId)));
    }
  }, [expandedZones.size, zoneGroups]);

  const handleResetToDefault = useCallback(() => {
    setCheckedKeys(new Set(availableRegions.map(regionKey)));
  }, [availableRegions]);

  const handleSave = useCallback(() => {
    const allowedRegions: CspRegion[] = availableRegions.filter((r) =>
      checkedKeys.has(regionKey(r))
    );
    // All regions selected == no restrictions; use delete to clear any existing policy
    if (allowedRegions.length === availableRegions.length) {
      deletePolicy(undefined, { onSuccess: onClose });
    } else {
      savePolicy({ allowed_regions: allowedRegions }, { onSuccess: onClose });
    }
  }, [availableRegions, checkedKeys, savePolicy, deletePolicy, onClose]);

  const isLoading = isPolicyLoading || isEndpointsLoading;
  const isBusy = isSaving || isDeleting;
  const isAllExpanded = expandedZones.size === zoneGroups.length;

  const zoneRowStyles = css`
    padding: ${euiTheme.size.s} ${euiTheme.size.s};
    border: ${euiTheme.border.thin};
    border-radius: ${euiTheme.border.radius.medium};
    margin-bottom: ${euiTheme.size.xs};
  `;

  const regionRowStyles = css`
    padding: ${euiTheme.size.xs} 0;
  `;

  const regionListStyles = css`
    padding: ${euiTheme.size.s} ${euiTheme.size.xl};
    border-top: ${euiTheme.border.thin};
  `;

  return (
    <EuiModal
      onClose={onClose}
      style={{ minWidth: 560 }}
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

            {/* Zone accordion list */}
            {zoneGroups.map((zone) => {
              const zoneKeys = zone.regions.map(regionKey);
              const checkedCount = zoneKeys.filter((k) => checkedKeys.has(k)).length;
              const isZoneChecked = checkedCount === zone.regions.length;
              const isZoneIndeterminate = checkedCount > 0 && checkedCount < zone.regions.length;
              const isExpanded = expandedZones.has(zone.zoneId);
              const zoneCheckboxId = `zone-checkbox-${zone.zoneId}`;

              return (
                <div key={zone.zoneId} data-test-subj={`manageRegionsZone-${zone.zoneId}`}>
                  <div css={zoneRowStyles}>
                    <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" gutterSize="s">
                      <EuiFlexItem grow={false}>
                        <EuiCheckbox
                          id={zoneCheckboxId}
                          checked={isZoneChecked}
                          indeterminate={isZoneIndeterminate}
                          onChange={() => handleToggleZone(zone)}
                          label={<strong>{zone.displayName}</strong>}
                          data-test-subj={`manageRegionsZoneCheckbox-${zone.zoneId}`}
                        />
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
                          <EuiFlexItem grow={false}>
                            <EuiText size="s" color="subdued">
                              {i18n.translate(
                                'xpack.searchInferenceEndpoints.manageRegions.zoneCount',
                                {
                                  defaultMessage:
                                    '{checked} of {total, plural, one {# region} other {# regions}}',
                                  values: {
                                    checked: checkedCount,
                                    total: zone.regions.length,
                                  },
                                }
                              )}
                            </EuiText>
                          </EuiFlexItem>
                          <EuiFlexItem grow={false}>
                            <EuiToolTip
                              content={
                                isExpanded
                                  ? i18n.translate(
                                      'xpack.searchInferenceEndpoints.manageRegions.collapseZone',
                                      {
                                        defaultMessage: 'Collapse {zone}',
                                        values: { zone: zone.displayName },
                                      }
                                    )
                                  : i18n.translate(
                                      'xpack.searchInferenceEndpoints.manageRegions.expandZone',
                                      {
                                        defaultMessage: 'Expand {zone}',
                                        values: { zone: zone.displayName },
                                      }
                                    )
                              }
                              disableScreenReaderOutput
                            >
                              <EuiButtonIcon
                                iconType={isExpanded ? 'arrowUp' : 'arrowDown'}
                                onClick={() => handleToggleExpand(zone.zoneId)}
                                aria-label={
                                  isExpanded
                                    ? i18n.translate(
                                        'xpack.searchInferenceEndpoints.manageRegions.collapseZone',
                                        {
                                          defaultMessage: 'Collapse {zone}',
                                          values: { zone: zone.displayName },
                                        }
                                      )
                                    : i18n.translate(
                                        'xpack.searchInferenceEndpoints.manageRegions.expandZone',
                                        {
                                          defaultMessage: 'Expand {zone}',
                                          values: { zone: zone.displayName },
                                        }
                                      )
                                }
                                data-test-subj={`manageRegionsZoneToggle-${zone.zoneId}`}
                              />
                            </EuiToolTip>
                          </EuiFlexItem>
                        </EuiFlexGroup>
                      </EuiFlexItem>
                    </EuiFlexGroup>

                    {isExpanded && (
                      <div css={regionListStyles}>
                        {zone.regions.map((r) => {
                          const key = regionKey(r);
                          const displayName = r.region;
                          return (
                            <div key={key} css={regionRowStyles}>
                              <EuiCheckbox
                                id={`region-${key}`}
                                label={displayName}
                                checked={checkedKeys.has(key)}
                                onChange={() => handleToggleRegion(key)}
                                data-test-subj={`manageRegionsCheckbox-${key}`}
                              />
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </>
        )}
      </EuiModalBody>

      <EuiModalFooter>
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
          isLoading={isSaving || isDeleting}
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
