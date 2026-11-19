/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiCodeBlock, EuiLink, EuiLoadingSpinner, EuiSpacer, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { useYaml } from '../../../../services';
import type { OTelComponentType } from '../graph_view/constants';
import { DETAIL_PANEL_CONTENT_MAX_HEIGHT } from '../graph_view/constants';

import { getComponentDocUrl } from './component_doc_links';

interface ComponentConfigTabProps {
  componentId: string;
  componentConfig: unknown;
  componentType: OTelComponentType;
}

export const ComponentConfigTab: React.FunctionComponent<ComponentConfigTabProps> = ({
  componentId,
  componentConfig,
  componentType,
}) => {
  const docUrl = getComponentDocUrl(componentType);
  const yaml = useYaml();

  const yamlContent = useMemo(() => {
    if (componentConfig == null || !yaml) {
      return null;
    }
    return yaml.stringify({ [componentId]: componentConfig }, { lineWidth: 0, singleQuote: false });
  }, [componentId, componentConfig, yaml]);

  if (componentConfig == null) {
    return (
      <EuiText size="s" color="subdued">
        {i18n.translate('xpack.fleet.otelUi.componentDetail.noConfiguration', {
          defaultMessage: 'No additional configuration',
        })}
      </EuiText>
    );
  }

  if (!yamlContent) {
    return <EuiLoadingSpinner />;
  }

  return (
    <>
      {docUrl && (
        <>
          <EuiLink href={docUrl} target="_blank" external data-test-subj="otelComponentDocLink">
            {i18n.translate('xpack.fleet.otelUi.componentDetail.viewDocumentation', {
              defaultMessage: 'View component documentation',
            })}
          </EuiLink>
          <EuiSpacer size="m" />
        </>
      )}
      <EuiCodeBlock
        overflowHeight={`${DETAIL_PANEL_CONTENT_MAX_HEIGHT}px`}
        language="yaml"
        isCopyable
        fontSize="m"
        paddingSize="s"
      >
        {yamlContent}
      </EuiCodeBlock>
    </>
  );
};
