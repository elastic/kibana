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

import { CreateIndexModal } from './create_index_modal';

export interface CreateIndexButtonProps {
  loadIndices: () => void;
  share?: SharePluginStart;
  dataTestSubj?: string;
}

export const CreateIndexButton = ({ loadIndices, share, dataTestSubj }: CreateIndexButtonProps) => {
  const [createIndexModalOpen, setCreateIndexModalOpen] = useState<boolean>(false);

  return (
    <>
      <EuiButton
        fill
        iconType="plusCircle"
        key="createIndexButton"
        data-test-subj={dataTestSubj || 'createIndexButton'}
        data-telemetry-id="idxMgmt-indexList-createIndexButton"
        onClick={() => setCreateIndexModalOpen(true)}
      >
        <FormattedMessage
          id="xpack.idxMgmt.indexTable.createIndexButton"
          defaultMessage="Create index"
        />
      </EuiButton>
      {createIndexModalOpen && (
        <CreateIndexModal
          closeModal={() => setCreateIndexModalOpen(false)}
          loadIndices={loadIndices}
        />
      )}
    </>
  );
};
