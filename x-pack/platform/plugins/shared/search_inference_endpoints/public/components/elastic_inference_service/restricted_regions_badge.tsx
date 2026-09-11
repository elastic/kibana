/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiPopoverFooter,
  EuiPopoverTitle,
  useGeneratedHtmlId,
  type UseEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { EisInferenceEndpoint, RegionPolicyResponse } from '../../../common/types';
import { computeSeedState } from '../../utils/compute_seed_state';
import {
  getAvailableGeos,
  getAvailableRegions,
  getZoneGroups,
  regionKey,
} from '../../utils/eis_utils';
import { toGeoSelectableOptions, toRegionSelectableOptions } from './location_selection_list';
import { RestrictedRegionsPolicyList } from './restricted_regions_policy_list';

const popoverPanelCss = ({ euiTheme }: UseEuiTheme) => css`
  min-width: ${euiTheme.base * 20}px;
`;

export interface RestrictedRegionsBadgeProps {
  policy: RegionPolicyResponse;
  endpoints: EisInferenceEndpoint[];
  onManageRegions?: () => void;
}

export const RestrictedRegionsBadge: React.FC<RestrictedRegionsBadgeProps> = ({
  policy,
  endpoints,
  onManageRegions,
}) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const popoverTitleId = useGeneratedHtmlId();

  const { options, listTestSubj, ariaLabel } = useMemo(() => {
    const regions = getAvailableRegions(endpoints);
    const geos = getAvailableGeos(endpoints);
    const listedRegionKeys = new Set(regions.map(regionKey));
    const availableRegions = [
      ...regions,
      ...(policy.region_policy.allowed_regions ?? []).filter(
        (region) => !listedRegionKeys.has(regionKey(region))
      ),
    ];
    const availableGeos = [...new Set([...geos, ...(policy.region_policy.allowed_geos ?? [])])];
    const {
      activeTab,
      geos: selectedGeos,
      regionKeys,
    } = computeSeedState(policy, availableRegions, availableGeos);
    const isGeoPolicy = activeTab === 'geo';

    return {
      options: isGeoPolicy
        ? toGeoSelectableOptions(availableGeos, selectedGeos)
        : toRegionSelectableOptions(getZoneGroups(availableRegions), regionKeys),
      listTestSubj: isGeoPolicy ? 'restrictedRegionsGeoList' : 'restrictedRegionsRegionList',
      ariaLabel: isGeoPolicy
        ? i18n.translate(
            'xpack.searchInferenceEndpoints.eisModelsPage.regionPolicyGeoListAriaLabel',
            { defaultMessage: 'Geographic zones' }
          )
        : i18n.translate(
            'xpack.searchInferenceEndpoints.eisModelsPage.regionPolicyRegionListAriaLabel',
            { defaultMessage: 'Regions' }
          ),
    };
  }, [endpoints, policy]);

  const closePopover = useCallback(() => setIsPopoverOpen(false), []);
  const togglePopover = useCallback(() => setIsPopoverOpen((open) => !open), []);
  const handleEdit = useCallback(() => {
    setIsPopoverOpen(false);
    onManageRegions?.();
  }, [onManageRegions]);

  return (
    <EuiPopover
      aria-labelledby={popoverTitleId}
      button={
        <EuiBadge
          color="warning"
          onClick={togglePopover}
          onClickAriaLabel={i18n.translate(
            'xpack.searchInferenceEndpoints.eisModelsPage.restrictedRegionsBadgeAriaLabel',
            { defaultMessage: 'Restricted regions: show region policy' }
          )}
          data-test-subj="restrictedRegionsBadge"
        >
          <FormattedMessage
            id="xpack.searchInferenceEndpoints.eisModelsPage.restrictedRegionsBadgeLabel"
            defaultMessage="Restricted regions"
          />
        </EuiBadge>
      }
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      ownFocus
      panelPaddingSize="s"
      panelProps={{
        css: popoverPanelCss,
        'data-test-subj': 'restrictedRegionsPopover',
      }}
    >
      <EuiPopoverTitle id={popoverTitleId} data-test-subj="restrictedRegionsPopoverTitle">
        <FormattedMessage
          id="xpack.searchInferenceEndpoints.eisModelsPage.regionPolicyPopoverTitle"
          defaultMessage="Region policy"
        />
      </EuiPopoverTitle>
      <RestrictedRegionsPolicyList
        options={options}
        ariaLabel={ariaLabel}
        data-test-subj={listTestSubj}
      />
      {onManageRegions && (
        <EuiPopoverFooter>
          <EuiFlexGroup justifyContent="center">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                size="s"
                onClick={handleEdit}
                data-test-subj="restrictedRegionsEditButton"
              >
                <FormattedMessage
                  id="xpack.searchInferenceEndpoints.eisModelsPage.editRegionPreferencesButtonLabel"
                  defaultMessage="Edit region preferences"
                />
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPopoverFooter>
      )}
    </EuiPopover>
  );
};

RestrictedRegionsBadge.displayName = 'RestrictedRegionsBadge';
