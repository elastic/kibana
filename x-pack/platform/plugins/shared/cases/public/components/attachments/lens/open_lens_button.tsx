/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isTextBasedAttributes } from '@kbn/lens-common';
import { EuiButtonEmpty } from '@elastic/eui';
import React, { useCallback } from 'react';
import { useKibana } from '../../../common/lib/kibana';
import { OPEN_IN_VISUALIZATION } from './translations';
import type { LensProps } from './types';

type Props = LensProps & { savedObjectId: string };

export const isOpenLensActionCompatible = (attributes: LensProps['attributes']): boolean =>
  !isTextBasedAttributes(attributes);

const OpenLensButtonComponent: React.FC<Props> = ({ savedObjectId, attributes, timeRange }) => {
  const {
    lens: { navigateToPrefilledEditor },
  } = useKibana().services;

  const onClick = useCallback(() => {
    navigateToPrefilledEditor(
      {
        id: savedObjectId,
        time_range: timeRange,
        attributes,
      },
      {
        openInNewTab: true,
      }
    );
  }, [savedObjectId, attributes, navigateToPrefilledEditor, timeRange]);

  return (
    <EuiButtonEmpty
      aria-label={OPEN_IN_VISUALIZATION}
      data-test-subj="cases-open-in-visualization-btn"
      iconType="lensApp"
      onClick={onClick}
    >
      {OPEN_IN_VISUALIZATION}
    </EuiButtonEmpty>
  );
};

OpenLensButtonComponent.displayName = 'OpenLensButton';

export const OpenLensButton = React.memo(OpenLensButtonComponent);
