/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isOfAggregateQueryType } from '@kbn/es-query';
import { EuiButtonEmpty } from '@elastic/eui';
import React, { useCallback } from 'react';
import { useKibana } from '../../common/lib/kibana';
import { OPEN_IN_VISUALIZATION } from './translations';
import type { LensProps } from './types';

type Props = LensProps & { attachmentId: string };

const OpenLensButtonComponent: React.FC<Props> = ({ attachmentId, attributes, timeRange }) => {
  const {
    lens: { navigateToPrefilledEditor, canUseEditor },
  } = useKibana().services;

  const onClick = useCallback(() => {
    navigateToPrefilledEditor(
      {
        id: attachmentId,
        timeRange,
        attributes,
      },
      {
        openInNewTab: true,
      }
    );
  }, [attachmentId, attributes, navigateToPrefilledEditor, timeRange]);

  const hasLensPermissions = canUseEditor();
  const isESQLQuery = isOfAggregateQueryType(attributes.state.query);

  if (!hasLensPermissions || isESQLQuery) {
    return null;
  }

  return (
    <EuiButtonEmpty
      aria-label={OPEN_IN_VISUALIZATION}
      data-test-subj="cases-open-in-visualization-btn"
      iconType="lensApp"
      isDisabled={!hasLensPermissions}
      onClick={onClick}
    >
      {OPEN_IN_VISUALIZATION}
    </EuiButtonEmpty>
  );
};

OpenLensButtonComponent.displayName = 'OpenLensButton';

export const OpenLensButton = React.memo(OpenLensButtonComponent);
