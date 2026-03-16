/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiConfirmModal, EuiText, useGeneratedHtmlId } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import type { ActiveSource } from '../../types/connector';

interface ConfirmBulkDeleteActiveSourcesModalProps {
  activeSources: ActiveSource[];
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean;
}

export const ConfirmBulkDeleteActiveSourcesModal: React.FC<
  ConfirmBulkDeleteActiveSourcesModalProps
> = ({ activeSources, onConfirm, onCancel, isDeleting }) => {
  const modalTitleId = useGeneratedHtmlId({ prefix: 'bulkDeleteActiveSourcesModalTitle' });

  const { totalWorkflows, totalTools } = useMemo(() => {
    let workflows = 0;
    let tools = 0;
    for (const source of activeSources) {
      workflows += source.workflows.length;
      tools += source.agentTools.length;
    }
    return { totalWorkflows: workflows, totalTools: tools };
  }, [activeSources]);

  const sourceCount = activeSources.length;

  return (
    <EuiConfirmModal
      title={i18n.translate('xpack.dataSources.bulkDeleteActiveSourcesModal.title', {
        defaultMessage: 'Delete {count, plural, one {# source} other {# sources}}',
        values: { count: sourceCount },
      })}
      aria-labelledby={modalTitleId}
      titleProps={{ id: modalTitleId }}
      onCancel={onCancel}
      onConfirm={onConfirm}
      isLoading={isDeleting}
      cancelButtonText={i18n.translate(
        'xpack.dataSources.bulkDeleteActiveSourcesModal.cancelButton',
        { defaultMessage: 'Cancel' }
      )}
      confirmButtonText={i18n.translate(
        'xpack.dataSources.bulkDeleteActiveSourcesModal.confirmButton',
        {
          defaultMessage: 'Delete {count, plural, one {# source} other {# sources}}',
          values: { count: sourceCount },
        }
      )}
      buttonColor="danger"
      data-test-subj="confirmBulkDeleteActiveSourcesModal"
    >
      <EuiText>
        {totalWorkflows > 0 || totalTools > 0 ? (
          <p>
            <FormattedMessage
              id="xpack.dataSources.bulkDeleteActiveSourcesModal.descriptionWithResources"
              defaultMessage="This will also delete {workflows} and {tools} associated with {count, plural, one {this source} other {these sources}}. This action cannot be undone."
              values={{
                count: sourceCount,
                workflows: (
                  <strong>
                    <FormattedMessage
                      id="xpack.dataSources.bulkDeleteActiveSourcesModal.workflowCount"
                      defaultMessage="{count, plural, one {# workflow} other {# workflows}}"
                      values={{ count: totalWorkflows }}
                    />
                  </strong>
                ),
                tools: (
                  <strong>
                    <FormattedMessage
                      id="xpack.dataSources.bulkDeleteActiveSourcesModal.toolCount"
                      defaultMessage="{count, plural, one {# tool} other {# tools}}"
                      values={{ count: totalTools }}
                    />
                  </strong>
                ),
              }}
            />
          </p>
        ) : (
          <p>
            <FormattedMessage
              id="xpack.dataSources.bulkDeleteActiveSourcesModal.description"
              defaultMessage="Are you sure you want to delete {count, plural, one {this source} other {these sources}}? This action cannot be undone."
              values={{ count: sourceCount }}
            />
          </p>
        )}
      </EuiText>
    </EuiConfirmModal>
  );
};
