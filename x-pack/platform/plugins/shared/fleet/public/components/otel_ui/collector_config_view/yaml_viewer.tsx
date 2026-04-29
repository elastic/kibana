/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiAccordion,
  EuiBadge,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
} from '@elastic/eui';
import { dump } from 'js-yaml';
import { i18n } from '@kbn/i18n';

import type { OTelCollectorConfig } from '../../../../common/types';

interface YamlViewerProps {
  config: OTelCollectorConfig;
}

export const YamlViewer: React.FunctionComponent<YamlViewerProps> = ({ config }) => {
  const yamlContent = useMemo(() => dump(config, { lineWidth: -1, quotingType: '"' }), [config]);

  const lineCount = useMemo(() => yamlContent.split('\n').filter(Boolean).length, [yamlContent]);

  return (
    <EuiAccordion
      id="otel-yaml-viewer"
      initialIsOpen={false}
      data-test-subj="otelYamlViewer"
      buttonContent={
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiText size="s">
              <strong>
                {i18n.translate('xpack.fleet.otelUi.yamlViewer.title', {
                  defaultMessage: 'Effective configuration (YAML)',
                })}
              </strong>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiBadge color="hollow">
              {i18n.translate('xpack.fleet.otelUi.yamlViewer.lineCount', {
                defaultMessage: '{lineCount} lines',
                values: { lineCount },
              })}
            </EuiBadge>
          </EuiFlexItem>
        </EuiFlexGroup>
      }
    >
      <EuiCodeBlock
        language="yaml"
        isCopyable
        fontSize="m"
        paddingSize="s"
        data-test-subj="otelYamlViewerCodeBlock"
      >
        {yamlContent}
      </EuiCodeBlock>
    </EuiAccordion>
  );
};
