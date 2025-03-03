/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ComponentProps, PropsWithChildren } from 'react';

import { EditSpace } from './edit_space';
import { EditSpaceProviderRoot, type EditSpaceProviderRootProps } from './provider';

type EditSpacePageProps = ComponentProps<typeof EditSpace> & EditSpaceProviderRootProps;

export function EditSpacePage({
  spaceId,
  getFeatures,
  history,
  onLoadSpace,
  selectedTabId,
  allowFeatureVisibility,
  allowSolutionVisibility,
  children,
  ...editSpaceServicesProps
}: PropsWithChildren<EditSpacePageProps>) {
  return (
    <EditSpaceProviderRoot {...editSpaceServicesProps}>
      <EditSpace
        spaceId={spaceId}
        getFeatures={getFeatures}
        history={history}
        onLoadSpace={onLoadSpace}
        selectedTabId={selectedTabId}
        allowFeatureVisibility={allowFeatureVisibility}
        allowSolutionVisibility={allowSolutionVisibility}
      />
    </EditSpaceProviderRoot>
  );
}
