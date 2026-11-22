/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCallOut, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { ICONS } from '../../icons';
import { ErrorState } from '../shared/error_state';
import { LoadingState } from '../shared/loading_state';
import { PauseReasonsSection } from './pause_reasons_section';
import { hasPausingStatus } from './status_utils';
import { StatusesSection } from './statuses_section';
import { useStatusesEditor } from './use_statuses_editor';
import * as i18n from './translations';

/** The status list and pause reasons of the space. */
export const StatusesTab: React.FC = () => {
  const editor = useStatusesEditor();
  const { config, isLoading, loadError, retryLoad, isReadOnly, isSaving, save, reload } = editor;

  return (
    <>
      {isReadOnly ? (
        <>
          <EuiCallOut
            announceOnMount
            size="s"
            iconType={ICONS.lock}
            title={i18n.READ_ONLY_TITLE}
            data-test-subj="investigationsSettingsReadOnly"
          >
            <p>{i18n.READ_ONLY_BODY}</p>
          </EuiCallOut>
          <EuiSpacer size="l" />
        </>
      ) : null}
      {loadError ? (
        <ErrorState title={i18n.LOAD_ERROR_TITLE} error={loadError} onRetry={retryLoad} />
      ) : isLoading || !config ? (
        <LoadingState label={i18n.LOADING} />
      ) : (
        <EuiFlexGroup direction="column" gutterSize="xl">
          <EuiFlexItem>
            <StatusesSection
              config={config}
              isReadOnly={isReadOnly}
              isSaving={isSaving}
              save={save}
              onReload={reload}
            />
          </EuiFlexItem>
          {hasPausingStatus(config.statuses) ? (
            <EuiFlexItem>
              <PauseReasonsSection
                config={config}
                isReadOnly={isReadOnly}
                isSaving={isSaving}
                save={save}
              />
            </EuiFlexItem>
          ) : null}
        </EuiFlexGroup>
      )}
    </>
  );
};
StatusesTab.displayName = 'StatusesTab';
