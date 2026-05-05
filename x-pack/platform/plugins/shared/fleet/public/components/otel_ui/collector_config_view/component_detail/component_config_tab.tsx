/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiCodeBlock, EuiText } from '@elastic/eui';
import { dump } from 'js-yaml';
import { i18n } from '@kbn/i18n';

interface ComponentConfigTabProps {
  componentId: string;
  componentConfig: unknown;
}

export const ComponentConfigTab: React.FunctionComponent<ComponentConfigTabProps> = ({
  componentId,
  componentConfig,
}) => {
  const yamlContent = useMemo(() => {
    if (componentConfig == null) {
      return null;
    }
    return dump({ [componentId]: componentConfig }, { lineWidth: -1, quotingType: '"' });
  }, [componentId, componentConfig]);

  if (!yamlContent) {
    return (
      <EuiText size="s" color="subdued">
        {i18n.translate('xpack.fleet.otelUi.componentDetail.noConfiguration', {
          defaultMessage: 'No additional configuration',
        })}
      </EuiText>
    );
  }

  return (
    <EuiCodeBlock overflowHeight="390px" language="yaml" isCopyable fontSize="m" paddingSize="s">
      {yamlContent}
    </EuiCodeBlock>
  );
};
