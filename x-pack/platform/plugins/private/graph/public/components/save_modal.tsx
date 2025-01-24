/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiFormRow, EuiTextArea, EuiCallOut, EuiSpacer, EuiSwitch } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { SavedObjectSaveModal, OnSaveProps } from '@kbn/saved-objects-plugin/public';

import { GraphSavePolicy } from '../types/config';

export interface OnSaveGraphProps extends OnSaveProps {
  newDescription: string;
  dataConsent: boolean;
}

export function SaveModal({
  onSave,
  onClose,
  title,
  description,
  showCopyOnSave,
  savePolicy,
  hasData,
}: {
  onSave: (props: OnSaveGraphProps) => void;
  onClose: () => void;
  title: string;
  description: string;
  showCopyOnSave: boolean;
  savePolicy: GraphSavePolicy;
  hasData: boolean;
}) {
  const [newDescription, setDescription] = useState(description);
  const [dataConsent, setDataConsent] = useState(false);
  return (
    <SavedObjectSaveModal
      onSave={(props) => {
        onSave({ ...props, newDescription, dataConsent });
      }}
      onClose={onClose}
      title={title}
      showCopyOnSave={showCopyOnSave}
      objectType={i18n.translate('xpack.graph.topNavMenu.save.objectType', {
        defaultMessage: 'graph',
      })}
      showDescription={false}
      options={
        <>
          <EuiFormRow
            fullWidth
            label={i18n.translate('xpack.graph.topNavMenu.save.descriptionInputLabel', {
              defaultMessage: 'Description',
            })}
          >
            <EuiTextArea
              data-test-subj="dashboardDescription"
              value={newDescription}
              onChange={(e) => {
                setDescription(e.target.value);
              }}
              fullWidth
              rows={5}
            />
          </EuiFormRow>
          {savePolicy === 'configAndDataWithConsent' && hasData && (
            <EuiFormRow
              fullWidth
              label=""
              helpText={i18n.translate('xpack.graph.topNavMenu.save.saveConfigurationOnlyWarning', {
                defaultMessage:
                  'Without this setting, the data in this workspace will be cleared and only the configuration will be saved.',
              })}
            >
              <EuiSwitch
                id="graphDataConsent"
                label={i18n.translate('xpack.graph.topNavMenu.save.saveGraphContentCheckboxLabel', {
                  defaultMessage: 'Save graph content',
                })}
                checked={dataConsent}
                onChange={(e) => {
                  setDataConsent(e.target.checked);
                }}
              />
            </EuiFormRow>
          )}
          {savePolicy === 'config' && hasData && (
            <>
              <EuiSpacer />
              <EuiCallOut data-test-subj="graphNoDataSavedMsg">
                <p>
                  {i18n.translate('xpack.graph.topNavMenu.save.saveConfigurationOnlyText', {
                    defaultMessage:
                      'The data in this workspace will be cleared and only the configuration will be saved.',
                  })}
                </p>
              </EuiCallOut>
              <EuiSpacer />
            </>
          )}
        </>
      }
    />
  );
}
