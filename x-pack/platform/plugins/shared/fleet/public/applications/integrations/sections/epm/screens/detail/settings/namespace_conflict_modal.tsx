/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { EuiCode, EuiConfirmModal, EuiSpacer, useGeneratedHtmlId } from '@elastic/eui';

import type { NamespaceConflictWarning } from '../../../../../../../../common/types/rest_spec/epm';

interface Props {
  conflicts: NamespaceConflictWarning[];
  onConfirm: () => void;
  onCancel: () => void;
}

export const NamespaceConflictModal: React.FC<Props> = ({ conflicts, onConfirm, onCancel }) => {
  const modalTitleId = useGeneratedHtmlId();

  return (
    <EuiConfirmModal
      title={i18n.translate(
        'xpack.fleet.integrations.settings.namespaceCustomization.conflictModal.title',
        { defaultMessage: 'Conflicting index templates detected' }
      )}
      aria-labelledby={modalTitleId}
      titleProps={{ id: modalTitleId }}
      onCancel={onCancel}
      onConfirm={onConfirm}
      cancelButtonText={i18n.translate(
        'xpack.fleet.integrations.settings.namespaceCustomization.conflictModal.cancel',
        { defaultMessage: 'Cancel' }
      )}
      confirmButtonText={i18n.translate(
        'xpack.fleet.integrations.settings.namespaceCustomization.conflictModal.confirm',
        { defaultMessage: 'Enable anyway' }
      )}
      buttonColor="warning"
      data-test-subj="epmSettings.namespaceConflictModal"
    >
      <FormattedMessage
        id="xpack.fleet.integrations.settings.namespaceCustomization.conflictModal.body"
        defaultMessage="One or more dedicated namespace index templates may conflict with the existing index templates:"
      />
      <EuiSpacer size="s" />
      <ul>
        {conflicts.map((w) =>
          w.conflictingTemplates.map((t) => (
            <li key={`${w.dataStreamName}-${w.namespace}-${t.name}`}>
              <EuiSpacer size="s" />
              {t.conflictType === 'overrides_fleet' && (
                <FormattedMessage
                  id="xpack.fleet.integrations.settings.namespaceCustomization.conflictModal.overridesFleet"
                  defaultMessage="Fleet's {dataStream} namespace template will be overridden by {template} (priority: {priority})"
                  values={{
                    dataStream: <EuiCode>{w.dataStreamName}</EuiCode>,
                    template: <EuiCode>{t.name}</EuiCode>,
                    priority: t.priority,
                  }}
                />
              )}
              {t.conflictType === 'blocked_by_same_priority' && (
                <FormattedMessage
                  id="xpack.fleet.integrations.settings.namespaceCustomization.conflictModal.blockedBySamePriority"
                  defaultMessage="Fleet's {dataStream} namespace template cannot be created because {template} (priority {priority}) has the same priority"
                  values={{
                    dataStream: <EuiCode>{w.dataStreamName}</EuiCode>,
                    template: <EuiCode>{t.name}</EuiCode>,
                    priority: t.priority,
                  }}
                />
              )}
              {t.conflictType === 'overridden_by_fleet' && (
                <FormattedMessage
                  id="xpack.fleet.integrations.settings.namespaceCustomization.conflictModal.overriddenByFleet"
                  defaultMessage="Fleet's {dataStream} namespace template will override {template} (priority {priority})"
                  values={{
                    dataStream: <EuiCode>{w.dataStreamName}</EuiCode>,
                    template: <EuiCode>{t.name}</EuiCode>,
                    priority: t.priority,
                  }}
                />
              )}
            </li>
          ))
        )}
      </ul>
      <EuiSpacer size="s" />
      <FormattedMessage
        id="xpack.fleet.integrations.settings.namespaceCustomization.conflictModal.resolution"
        defaultMessage="To resolve, remove or adjust the priority of the conflicting templates."
      />
    </EuiConfirmModal>
  );
};
