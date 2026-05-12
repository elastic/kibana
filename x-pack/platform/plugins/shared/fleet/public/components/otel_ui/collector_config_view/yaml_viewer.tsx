/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { dump } from 'js-yaml';
import { i18n } from '@kbn/i18n';

import type { OTelCollectorConfig } from '../../../../common/types';

interface YamlViewerProps {
  config: OTelCollectorConfig;
  agentName?: string;
}

export const YamlViewer: React.FunctionComponent<YamlViewerProps> = ({ config, agentName }) => {
  const yamlContent = useMemo(() => dump(config, { lineWidth: -1, quotingType: '"' }), [config]);

  const lineCount = useMemo(() => yamlContent.split('\n').filter(Boolean).length, [yamlContent]);

  const downloadFile = useCallback(() => {
    const link = document.createElement('a');
    link.href = `data:text/yaml;charset=utf-8,${encodeURIComponent(yamlContent)}`;
    link.download = `${agentName || 'collector'}-effective-config.yaml`;
    link.click();
  }, [yamlContent, agentName]);

  return (
    <div data-test-subj="otelYamlViewer">
      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" responsive={false}>
        <EuiFlexItem grow={false}>
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
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="s"
            iconType="download"
            onClick={downloadFile}
            data-test-subj="otelYamlViewerDownload"
          >
            {i18n.translate('xpack.fleet.otelUi.yamlViewer.downloadButton', {
              defaultMessage: 'Download',
            })}
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <EuiCodeBlock
        overflowHeight="60vh"
        language="yaml"
        isCopyable
        fontSize="m"
        paddingSize="s"
        data-test-subj="otelYamlViewerCodeBlock"
      >
        {yamlContent}
      </EuiCodeBlock>
    </div>
  );
};
