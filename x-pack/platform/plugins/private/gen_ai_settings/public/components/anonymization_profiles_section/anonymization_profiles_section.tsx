/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { AnonymizationProfilesSection as SharedAnonymizationProfilesSection } from '@kbn/anonymization-ui';
import { useKibana } from '../../hooks/use_kibana';
import { useAnonymizationProfilesSectionState } from './use_anonymization_profiles_section_state';

export const AnonymizationProfilesSection = () => {
  const { services } = useKibana();
  const state = useAnonymizationProfilesSectionState({ services });

  return (
    <SharedAnonymizationProfilesSection
      fetch={services.http.fetch}
      spaceId={state.activeSpaceId}
      canShow={state.canShow}
      canManage={state.canManage}
      fetchPreviewDocument={state.fetchPreviewDocument}
      onCreateSuccess={state.onCreateSuccess}
      onUpdateSuccess={state.onUpdateSuccess}
      onDeleteSuccess={state.onDeleteSuccess}
      onCreateConflict={state.onCreateConflict}
      onOpenConflictError={state.onOpenConflictError}
    />
  );
};
