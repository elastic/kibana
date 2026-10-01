/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiFormRow, EuiSwitch, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import {
  getRegistryDataStreamAssetBaseName,
  isColumnarEligible,
  isColumnarIndexMode,
} from '../../../../../../../../../common/services';
import type {
  ExperimentalDataStreamFeature,
  RegistryDataStream,
} from '../../../../../../../../../common/types';
import { InlineReleaseBadge } from '../../../../../../components';

interface Props {
  registryDataStream: RegistryDataStream;
  experimentalDataStreamFeatures?: ExperimentalDataStreamFeature[];
  onChange: (experimentalDataStreamFeatures: ExperimentalDataStreamFeature[]) => void;
}

const LABEL = i18n.translate('xpack.fleet.packagePolicy.experimentalFeatures.columnarLabel', {
  defaultMessage: 'Columnar index mode',
});

const DESCRIPTION = i18n.translate(
  'xpack.fleet.packagePolicy.experimentalFeatures.columnarDescription',
  {
    defaultMessage:
      'Stores fields using columnar (doc-values only) storage for improved compression and aggregation performance. Not compatible with TSDB. Tech preview.',
  }
);

const DISABLED_TSDB_TOOLTIP = i18n.translate(
  'xpack.fleet.packagePolicy.experimentalFeatures.columnarDisabledTooltip',
  {
    defaultMessage:
      'Columnar index mode cannot be enabled on a data stream that uses time series (TSDB) indexing.',
  }
);

const DISABLED_BY_INTEGRATION_TOOLTIP = i18n.translate(
  'xpack.fleet.packagePolicy.experimentalFeatures.columnarEnabledByIntegrationTooltip',
  {
    defaultMessage: 'Columnar index mode is enabled by the integration.',
  }
);

const NOT_SUPPORTED_TOOLTIP = i18n.translate(
  'xpack.fleet.packagePolicy.experimentalFeatures.columnarNotSupportedTooltip',
  {
    defaultMessage:
      'This integration has not declared columnar index mode support for this data stream.',
  }
);

const NO_LONGER_SUPPORTED_TOOLTIP = i18n.translate(
  'xpack.fleet.packagePolicy.experimentalFeatures.columnarNoLongerSupportedTooltip',
  {
    defaultMessage:
      'This integration no longer declares columnar support for this data stream; you can turn it off.',
  }
);

/**
 * Tech preview opt-in for the columnar index mode (`logsdb_columnar` for logs data streams,
 * `columnar` otherwise). The opt-in is stored per data stream in
 * `packagePolicy.package.experimental_data_stream_features`, keyed by the index template name.
 */
export const ColumnarIndexModeToggle: React.FunctionComponent<Props> = ({
  registryDataStream,
  experimentalDataStreamFeatures,
  onChange,
}) => {
  const dataStreamName = getRegistryDataStreamAssetBaseName(registryDataStream);

  const currentFeatures = useMemo(
    () =>
      experimentalDataStreamFeatures?.find(({ data_stream: ds }) => ds === dataStreamName)
        ?.features,
    [experimentalDataStreamFeatures, dataStreamName]
  );

  const manifestIndexMode = registryDataStream.elasticsearch?.index_mode;
  const isTsdbDeclaredByPackage = manifestIndexMode === 'time_series';
  const isColumnarDeclaredByPackage = isColumnarIndexMode(manifestIndexMode);
  const isTsdbOptedIn = currentFeatures?.tsdb === true;

  // The package must declare readiness (`elasticsearch.columnar.supported: true`) before the
  // opt-in is offered; declaring a columnar index_mode outright also counts as ready.
  const isEligible = isColumnarEligible(registryDataStream);

  // Stale opt-in: the policy still has columnar on but the package no longer declares support
  // for it (e.g. after an upgrade). The switch must stay on *and* interactive so the user can
  // turn it off — the server only rejects turning columnar on, never off.
  const isStaleOptIn = !isEligible && currentFeatures?.columnar === true;

  const isTsdbEnabled = isTsdbDeclaredByPackage || isTsdbOptedIn;
  const isDisabled = isStaleOptIn
    ? false
    : isTsdbEnabled || isColumnarDeclaredByPackage || !isEligible;
  const isChecked = isStaleOptIn
    ? true
    : isEligible
    ? currentFeatures?.columnar ?? isColumnarDeclaredByPackage
    : false;

  const handleChange = useCallback(
    (checked: boolean) => {
      const features = (experimentalDataStreamFeatures ?? []).map((entry) => ({
        ...entry,
        features: { ...entry.features },
      }));
      const existing = features.find(({ data_stream: ds }) => ds === dataStreamName);
      if (existing) {
        existing.features.columnar = checked;
      } else {
        features.push({ data_stream: dataStreamName, features: { columnar: checked } });
      }
      onChange(features);
    },
    [experimentalDataStreamFeatures, dataStreamName, onChange]
  );

  const tooltip = isStaleOptIn
    ? NO_LONGER_SUPPORTED_TOOLTIP
    : isTsdbEnabled
    ? DISABLED_TSDB_TOOLTIP
    : isColumnarDeclaredByPackage
    ? DISABLED_BY_INTEGRATION_TOOLTIP
    : !isEligible
    ? NOT_SUPPORTED_TOOLTIP
    : undefined;

  const switchElement = (
    <EuiSwitch
      data-test-subj="packagePolicyEditor.columnarIndexMode.switch"
      label={LABEL}
      showLabel={false}
      checked={isChecked}
      disabled={isDisabled}
      onChange={(e) => handleChange(e.target.checked)}
    />
  );

  return (
    <EuiFormRow
      fullWidth
      label={
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>{LABEL}</EuiFlexItem>
          <EuiFlexItem grow={false}>
            <InlineReleaseBadge release="preview" />
          </EuiFlexItem>
        </EuiFlexGroup>
      }
      helpText={DESCRIPTION}
    >
      {tooltip ? (
        // Historically only rendered for the disabled states, hence the test subject name; it is
        // also used to explain the still-interactive stale opt-in.
        <span data-test-subj="packagePolicyEditor.columnarIndexMode.disabledTooltip">
          <EuiToolTip content={tooltip} position="right" display="inlineBlock">
            {switchElement}
          </EuiToolTip>
        </span>
      ) : (
        switchElement
      )}
    </EuiFormRow>
  );
};
