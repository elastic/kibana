/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiButtonIcon,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { dump } from 'js-yaml';
import { i18n } from '@kbn/i18n';

import type { OTelCollectorConfig, OTelCollectorComponentID } from '../../../../common/types';

import type { OTelComponentType } from './graph_view/constants';
import { COMPONENT_TYPE_LABELS } from './graph_view/constants';

const getComponentSection = (
  config: OTelCollectorConfig,
  componentType: OTelComponentType
): Record<OTelCollectorComponentID, unknown> | undefined => {
  switch (componentType) {
    case 'receiver':
      return config.receivers;
    case 'processor':
      return config.processors;
    case 'connector':
      return config.connectors;
    case 'exporter':
      return config.exporters;
  }
};

interface OTelComponentDetailProps {
  componentId: string;
  componentType: OTelComponentType;
  config: OTelCollectorConfig;
  onClose: () => void;
}

export const OTelComponentDetail: React.FunctionComponent<OTelComponentDetailProps> = ({
  componentId,
  componentType,
  config,
  onClose,
}) => {
  const section = getComponentSection(config, componentType);
  const componentConfig = section?.[componentId];

  const yamlContent = useMemo(() => {
    if (componentConfig == null) {
      return null;
    }
    return dump({ [componentId]: componentConfig }, { lineWidth: -1, quotingType: '"' });
  }, [componentId, componentConfig]);

  return (
    <EuiPanel
      paddingSize="m"
      css={css`
        flex: 0 0 350px;
        max-width: 400px;
        overflow: auto;
      `}
      data-test-subj="otelComponentDetail"
    >
      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiTitle size="xxs">
            <h4>
              {COMPONENT_TYPE_LABELS[componentType]}: {componentId}
            </h4>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            iconType="cross"
            aria-label={i18n.translate('xpack.fleet.otelUi.componentDetail.closeButtonAriaLabel', {
              defaultMessage: 'Close component detail',
            })}
            onClick={onClose}
            data-test-subj="otelComponentDetailCloseButton"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      {yamlContent ? (
        <EuiCodeBlock language="yaml" isCopyable fontSize="m" paddingSize="s">
          {yamlContent}
        </EuiCodeBlock>
      ) : (
        <EuiText size="s" color="subdued">
          {i18n.translate('xpack.fleet.otelUi.componentDetail.noConfiguration', {
            defaultMessage: 'No additional configuration',
          })}
        </EuiText>
      )}
    </EuiPanel>
  );
};
