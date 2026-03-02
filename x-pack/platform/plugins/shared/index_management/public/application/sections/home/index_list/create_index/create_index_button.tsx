/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import { EuiButton } from '@elastic/eui';

import useObservable from 'react-use/lib/useObservable';
import { CreateIndexModal } from './create_index_modal';
import { CreateIndexModalV2 } from './create_index_modal_v2';
import { useAppContext } from '../../../../app_context';
import { useIsPlatformIndexManagementV2Enabled } from '../../../../hooks/use_is_platform_index_management_v2_enabled';

export interface CreateIndexButtonProps {
  loadIndices: () => void;
  share?: SharePluginStart;
  dataTestSubj?: string;
}

export const CreateIndexButton = ({ loadIndices, share, dataTestSubj }: CreateIndexButtonProps) => {
  const isPlatformIndexManagementV2Enabled = useIsPlatformIndexManagementV2Enabled();
  const [createIndexModalOpen, setCreateIndexModalOpen] = useState<boolean>(false);
  const createIndexUrl = share?.url.locators.get('SEARCH_CREATE_INDEX')?.useUrl({});

  const {
    core: { chrome },
  } = useAppContext();

  const activeSolutionId = useObservable(chrome.getActiveSolutionNavId$());

  const actionProp =
    createIndexUrl && activeSolutionId === 'es'
      ? { href: createIndexUrl }
      : { onClick: () => setCreateIndexModalOpen(true) };

  return (
    <>
      <EuiButton
        fill
        iconType="plusInCircleFilled"
        key="createIndexButton"
        data-test-subj={dataTestSubj || 'createIndexButton'}
        data-telemetry-id="idxMgmt-indexList-createIndexButton"
        {...actionProp}
      >
        <FormattedMessage
          id="xpack.idxMgmt.indexTable.createIndexButton"
          defaultMessage="Create index"
        />
      </EuiButton>
      {createIndexModalOpen &&
        (isPlatformIndexManagementV2Enabled ? (
          <CreateIndexModalV2
            closeModal={() => setCreateIndexModalOpen(false)}
            loadIndices={loadIndices}
          />
        ) : (
          <CreateIndexModal
            closeModal={() => setCreateIndexModalOpen(false)}
            loadIndices={loadIndices}
          />
        ))}
    </>
  );
};
