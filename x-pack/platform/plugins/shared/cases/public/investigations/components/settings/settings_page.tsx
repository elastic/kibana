/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPageHeader,
  EuiSpacer,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { useCasesContext } from '../../../components/cases_context/use_cases_context';
import { useInvestigationBreadcrumbs, useInvestigationsNavigation } from '../../hooks';
import { ICONS } from '../../icons';
import { ManageTypesLink } from '../fields/manage_types_link';
import { ErrorState } from '../shared/error_state';
import { LoadingState } from '../shared/loading_state';
import { PauseReasonsSection } from './pause_reasons_section';
import { hasPausingStatus } from './status_utils';
import { StatusesSection } from './statuses_section';
import { useStatusesEditor } from './use_statuses_editor';
import * as i18n from './translations';

/** `/settings`: the status list and pause reasons of the space. */
export const SettingsPage: React.FC = () => {
  const { euiTheme } = useEuiTheme();
  const { goToQueue } = useInvestigationsNavigation();
  const { permissions } = useCasesContext();
  const editor = useStatusesEditor();
  const { config, isLoading, loadError, retryLoad, isReadOnly, isSaving, save, reload } = editor;

  useInvestigationBreadcrumbs(i18n.PAGE_TITLE);

  return (
    <div
      css={css`
        height: 100%;
        overflow-y: auto;
        padding: ${euiTheme.size.l};
      `}
      data-test-subj="investigationsSettingsPage"
    >
      <EuiButtonEmpty
        size="s"
        flush="left"
        iconType={ICONS.chevronLeft}
        aria-label={i18n.BACK_TO_QUEUE_ARIA}
        onClick={goToQueue}
        data-test-subj="investigationsSettingsBack"
      >
        {i18n.BACK_TO_QUEUE}
      </EuiButtonEmpty>
      <EuiPageHeader
        pageTitle={i18n.PAGE_TITLE}
        description={i18n.PAGE_DESCRIPTION}
        bottomBorder={false}
      />
      {permissions.manageTemplates ? (
        <>
          <EuiSpacer size="s" />
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
            <EuiFlexItem grow={false}>
              <EuiText size="s" color="subdued">
                {i18n.MANAGE_TYPES_HELP}
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <ManageTypesLink />
            </EuiFlexItem>
          </EuiFlexGroup>
        </>
      ) : null}
      <EuiSpacer size="l" />
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
    </div>
  );
};
SettingsPage.displayName = 'SettingsPage';
