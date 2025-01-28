/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

import type { DownloadSource } from '../../../../types';

import type { useConfirmModal } from '../../hooks/use_confirm_modal';

import { getCountsForDownloadSource } from './services/get_count';

interface ConfirmDescriptionProps {
  downloadSource: DownloadSource;
  agentCount?: number;
  agentPolicyCount?: number;
}

const ConfirmDescription: React.FunctionComponent<ConfirmDescriptionProps> = ({
  downloadSource,
  agentCount,
  agentPolicyCount,
}) =>
  agentCount !== undefined && agentPolicyCount !== undefined ? (
    <FormattedMessage
      id="xpack.fleet.settings.updateDownloadSourceModal.confirmModalText"
      data-test-subj="editDownloadSourcesConfirmModal.confirmModalText"
      defaultMessage="This action will update {downloadSourceName} agent binary source. It will update {policies} and {agents}. This action can not be undone. Are you sure you wish to continue?"
      values={{
        downloadSourceName: <strong>{downloadSource.name}</strong>,
        agents: (
          <strong>
            <FormattedMessage
              id="xpack.fleet.settings.updateDownloadSourceModal.agentsCount"
              defaultMessage="{agentCount, plural, one {# agent} other {# agents}}"
              values={{
                agentCount,
              }}
            />
          </strong>
        ),
        policies: (
          <strong>
            <FormattedMessage
              id="xpack.fleet.settings.updateDownloadSourceModal.agentPolicyCount"
              defaultMessage="{agentPolicyCount, plural, one {# agent policy} other {# agent policies}}"
              values={{
                agentPolicyCount,
              }}
            />
          </strong>
        ),
      }}
    />
  ) : (
    <FormattedMessage
      id="xpack.fleet.settings.updateDownloadSourceModal.confirmModalTextWithoutCount"
      data-test-subj="editDownloadSourcesConfirmModal.confirmModalText"
      defaultMessage="This action will update {downloadSourceName} agent binary source. It will update related policies and agents. This action can not be undone. Are you sure you wish to continue?"
      values={{
        downloadSourceName: <strong>{downloadSource.name}</strong>,
      }}
    />
  );

export async function confirmUpdate(
  downloadSource: DownloadSource,
  confirm: ReturnType<typeof useConfirmModal>['confirm']
) {
  const { agentCount, agentPolicyCount } = await getCountsForDownloadSource(downloadSource).catch(
    () => ({
      //  Fail gracefully when counts are not avaiable
      agentCount: undefined,
      agentPolicyCount: undefined,
    })
  );
  return confirm(
    <FormattedMessage
      id="xpack.fleet.settings.updateDownloadSourceModal.confirmModalTitle"
      defaultMessage="Save and deploy changes?"
    />,
    <ConfirmDescription
      agentCount={agentCount}
      agentPolicyCount={agentPolicyCount}
      downloadSource={downloadSource}
    />
  );
}
