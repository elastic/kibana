/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiHorizontalRule, EuiSkeletonText, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import type { DreamingEntities } from '../../../../../common/dreaming';
import {
  DreamingConfigEditor,
  type DreamingConfigDraft,
  type DreamingConfigEditorParts,
} from '../../dreaming_config/dreaming_config_editor';
import { SettingsRow } from './settings_row';

const learnsTitle = i18n.translate('xpack.contextEngine.aiIndexDetail.dreaming.learnsTitle', {
  defaultMessage: 'What dreaming learns',
});

const learnsDescription = i18n.translate(
  'xpack.contextEngine.aiIndexDetail.dreaming.learnsDescription',
  {
    defaultMessage: 'Fact types always. Entity and relationship types when entities are on.',
  }
);

const renderRows = ({
  facts,
  entitiesSwitchLabel,
  entitiesDescription,
  renderEntitiesSwitch,
  entityTypes,
  relationshipTypes,
}: DreamingConfigEditorParts) => (
  <>
    <SettingsRow title={learnsTitle} description={learnsDescription}>
      {facts}
    </SettingsRow>
    <EuiHorizontalRule margin="m" />
    <SettingsRow title={entitiesSwitchLabel} description={entitiesDescription}>
      {renderEntitiesSwitch({ showLabel: false })}
      {entityTypes && (
        <>
          <EuiSpacer size="l" />
          {entityTypes}
        </>
      )}
      {relationshipTypes && (
        <>
          <EuiHorizontalRule margin="l" />
          {relationshipTypes}
        </>
      )}
    </SettingsRow>
  </>
);

interface DreamingLearnsRowsProps {
  /** Undefined while the draft is still loading. */
  draft: DreamingConfigDraft | undefined;
  onChange: (draft: DreamingConfigDraft) => void;
  suggestedEntities?: DreamingEntities;
}

/** The dreaming config editor laid out as settings rows: what dreaming learns, then entities. */
export const DreamingLearnsRows = ({
  draft,
  onChange,
  suggestedEntities,
}: DreamingLearnsRowsProps) => {
  if (!draft) {
    return (
      <SettingsRow title={learnsTitle} description={learnsDescription}>
        <EuiSkeletonText lines={8} />
      </SettingsRow>
    );
  }

  return (
    <DreamingConfigEditor
      draft={draft}
      onChange={onChange}
      renderLayout={renderRows}
      {...(suggestedEntities && { suggestedEntities })}
    />
  );
};
