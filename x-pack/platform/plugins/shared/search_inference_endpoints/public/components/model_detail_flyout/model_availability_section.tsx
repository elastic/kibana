/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiPanel,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { EisInferenceEndpoint } from '../../../common/types';
import {
  getAvailableGeos,
  getAvailableRegions,
  getGeoDisplayName,
  getRegionDisplayName,
  getZoneGroups,
  regionKey,
} from '../../utils/eis_utils';
import { LocationStatusList } from '../elastic_inference_service/location_status_list';

export interface ModelAvailabilitySectionProps {
  allEndpoints: EisInferenceEndpoint[];
  modelEndpoints: EisInferenceEndpoint[];
}

export const ModelAvailabilitySection: React.FC<ModelAvailabilitySectionProps> = ({
  allEndpoints,
  modelEndpoints,
}) => {
  const { regionItems, geoItems } = useMemo(() => {
    const regions = getAvailableRegions(allEndpoints);
    const geos = getAvailableGeos(allEndpoints);
    const modelRegionKeys = new Set(getAvailableRegions(modelEndpoints).map(regionKey));
    const modelGeos = new Set(getAvailableGeos(modelEndpoints));

    return {
      regionItems: getZoneGroups(regions).flatMap((zone) => [
        {
          key: zone.geo,
          label: zone.displayName,
          isOn: false,
          isGroupLabel: true,
          'data-test-subj': `modelAvailabilityZone-${zone.geo}`,
        },
        ...zone.regions.map((region) => {
          const key = regionKey(region);
          return {
            key,
            label: getRegionDisplayName(region),
            isOn: modelRegionKeys.has(key),
            'data-test-subj': `modelAvailabilityRegion-${key}`,
          };
        }),
      ]),
      geoItems: geos.map((geo) => ({
        key: geo,
        label: getGeoDisplayName(geo),
        isOn: modelGeos.has(geo),
        'data-test-subj': `modelAvailabilityGeo-${geo}`,
      })),
    };
  }, [allEndpoints, modelEndpoints]);

  const hasRegionItems = regionItems.length > 0;
  const hasGeoItems = geoItems.length > 0;
  if (!hasRegionItems && !hasGeoItems) {
    return null;
  }

  return (
    <>
      <EuiHorizontalRule margin="xxl" />
      <EuiFlexGroup direction="column" gutterSize="m" data-test-subj="modelAvailabilitySection">
        <EuiFlexItem grow={false}>
          <EuiFlexGroup direction="column" gutterSize="xs">
            <EuiFlexItem grow={false}>
              <EuiTitle size="xxs">
                <h3>
                  {i18n.translate(
                    'xpack.searchInferenceEndpoints.modelDetailFlyout.modelAvailabilityTitle',
                    { defaultMessage: 'Model availability' }
                  )}
                </h3>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="s" color="subdued" data-test-subj="modelAvailabilityHelpText">
                {i18n.translate(
                  'xpack.searchInferenceEndpoints.modelDetailFlyout.modelAvailabilityHelpText',
                  {
                    defaultMessage:
                      'Actual model availability may differ based on your region preferences.',
                  }
                )}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiPanel
            hasBorder
            hasShadow={false}
            paddingSize="m"
            data-test-subj="modelAvailabilityPanel"
          >
            <EuiFlexGroup direction="column" gutterSize="m">
              {hasRegionItems && (
                <EuiFlexItem grow={false}>
                  <EuiFlexGroup direction="column" gutterSize="s">
                    <EuiFlexItem grow={false}>
                      <EuiTitle size="xxxs">
                        <h4>
                          {i18n.translate(
                            'xpack.searchInferenceEndpoints.modelDetailFlyout.modelAvailabilityRegionsTitle',
                            { defaultMessage: 'Regions' }
                          )}
                        </h4>
                      </EuiTitle>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <LocationStatusList
                        items={regionItems}
                        ariaLabel={i18n.translate(
                          'xpack.searchInferenceEndpoints.modelDetailFlyout.modelAvailabilityRegionsAriaLabel',
                          { defaultMessage: 'Regions' }
                        )}
                        data-test-subj="modelAvailabilityRegionList"
                        onIconTestSubj="modelAvailabilityAvailableIcon"
                        offIconTestSubj="modelAvailabilityUnavailableIcon"
                        onAriaLabel={i18n.translate(
                          'xpack.searchInferenceEndpoints.modelDetailFlyout.modelAvailabilityAvailableAriaLabel',
                          { defaultMessage: 'Available' }
                        )}
                        offAriaLabel={i18n.translate(
                          'xpack.searchInferenceEndpoints.modelDetailFlyout.modelAvailabilityUnavailableAriaLabel',
                          { defaultMessage: 'Not available' }
                        )}
                      />
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>
              )}
              {hasGeoItems && (
                <EuiFlexItem grow={false}>
                  <EuiFlexGroup direction="column" gutterSize="s">
                    <EuiFlexItem grow={false}>
                      <EuiTitle size="xxxs">
                        <h4>
                          {i18n.translate(
                            'xpack.searchInferenceEndpoints.modelDetailFlyout.modelAvailabilityGeosTitle',
                            { defaultMessage: 'Geos' }
                          )}
                        </h4>
                      </EuiTitle>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <LocationStatusList
                        items={geoItems}
                        ariaLabel={i18n.translate(
                          'xpack.searchInferenceEndpoints.modelDetailFlyout.modelAvailabilityGeosAriaLabel',
                          { defaultMessage: 'Geos' }
                        )}
                        data-test-subj="modelAvailabilityGeoList"
                        onIconTestSubj="modelAvailabilityAvailableIcon"
                        offIconTestSubj="modelAvailabilityUnavailableIcon"
                        onAriaLabel={i18n.translate(
                          'xpack.searchInferenceEndpoints.modelDetailFlyout.modelAvailabilityAvailableAriaLabel',
                          { defaultMessage: 'Available' }
                        )}
                        offAriaLabel={i18n.translate(
                          'xpack.searchInferenceEndpoints.modelDetailFlyout.modelAvailabilityUnavailableAriaLabel',
                          { defaultMessage: 'Not available' }
                        )}
                      />
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
