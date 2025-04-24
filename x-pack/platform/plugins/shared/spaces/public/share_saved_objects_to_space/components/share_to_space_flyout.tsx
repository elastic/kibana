/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual } from 'lodash';
import React from 'react';

import type { ShareToSpaceFlyoutProps } from '../types';

export const getShareToSpaceFlyoutComponent = async (): Promise<
  React.FC<ShareToSpaceFlyoutProps>
> => {
  const { ShareToSpaceFlyoutInternal } = await import('./share_to_space_flyout_internal');
  return React.memo(
    (props: ShareToSpaceFlyoutProps) => {
      return <ShareToSpaceFlyoutInternal {...props} />;
    },
    (prevProps, nextProps) => {
      return (
        prevProps.behaviorContext === nextProps.behaviorContext &&
        prevProps.savedObjectTarget.id === nextProps.savedObjectTarget.id &&
        prevProps.savedObjectTarget.type === nextProps.savedObjectTarget.type &&
        isEqual(prevProps.savedObjectTarget.namespaces, nextProps.savedObjectTarget.namespaces)
      );
    }
  );
};
