/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiConfirmModal,
  EuiOverlayMask,
  EuiSpacer,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { KbnDangerCallout } from '@kbn/ui-callout';

import { mainTranslations } from './main_i18n';

export interface ConfirmDeleteDataSetsModalProps {
  dataSetNames: readonly string[];
  isDeleting: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}

export const ConfirmDeleteDataSetsModal = ({
  dataSetNames,
  isDeleting,
  error,
  onCancel,
  onConfirm,
}: ConfirmDeleteDataSetsModalProps) => {
  const titleId = useGeneratedHtmlId({ prefix: 'confirmDeleteDataSetsTitle' });
  const count = dataSetNames.length;

  return (
    <EuiOverlayMask>
      <EuiConfirmModal
        title={mainTranslations.confirmDeleteDataSets.title}
        titleProps={{ id: titleId }}
        aria-labelledby={titleId}
        buttonColor="danger"
        confirmButtonText={mainTranslations.confirmDeleteDataSets.confirmButton}
        cancelButtonText={mainTranslations.confirmDeleteDataSets.cancelButton}
        defaultFocusedButton="cancel"
        onConfirm={onConfirm}
        onCancel={onCancel}
        confirmButtonDisabled={isDeleting}
      >
        <EuiText size="s">
          <p>{mainTranslations.confirmDeleteDataSets.prompt(count)}</p>
          <ul>
            {dataSetNames.map((name) => (
              <li key={name}>
                <strong>{name}</strong>
              </li>
            ))}
          </ul>
          <p>{mainTranslations.confirmDeleteDataSets.warning}</p>
        </EuiText>
        {error ? (
          <>
            <EuiSpacer size="m" />
            <KbnDangerCallout
              title={mainTranslations.confirmDeleteDataSets.errorTitle}
              size="s"
              announceOnMount
              text={error}
            />
          </>
        ) : null}
      </EuiConfirmModal>
    </EuiOverlayMask>
  );
};
