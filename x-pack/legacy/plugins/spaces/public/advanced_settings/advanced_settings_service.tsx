/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { PAGE_TITLE_COMPONENT, PAGE_SUBTITLE_COMPONENT } from 'ui/management';
import { Space } from '../../common/model/space';
import { AdvancedSettingsTitle, AdvancedSettingsSubtitle } from './components';

interface SetupDeps {
  getActiveSpace: () => Promise<Space>;
  registerSettingsComponent: (
    id: string,
    component: string | React.FC<any>,
    allowOverride: boolean
  ) => void;
}

export class AdvancedSettingsService {
  public setup({ getActiveSpace, registerSettingsComponent }: SetupDeps) {
    const PageTitle = () => <AdvancedSettingsTitle getActiveSpace={getActiveSpace} />;
    const SubTitle = () => <AdvancedSettingsSubtitle getActiveSpace={getActiveSpace} />;

    registerSettingsComponent(PAGE_TITLE_COMPONENT, PageTitle, true);
    registerSettingsComponent(PAGE_SUBTITLE_COMPONENT, SubTitle, true);
  }
}
