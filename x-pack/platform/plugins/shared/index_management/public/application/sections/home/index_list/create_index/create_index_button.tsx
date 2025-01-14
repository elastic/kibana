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
}

export const CreateIndexButton = ({ loadIndices, share }: CreateIndexButtonProps) => {
  const [createIndexModalOpen, setCreateIndexModalOpen] = useState<boolean>(false);
  const createIndexUrl = share?.url.locators.get('SEARCH_CREATE_INDEX')?.useUrl({});
  const actionProp = createIndexUrl
    ? { href: createIndexUrl }
    : { onClick: () => setCreateIndexModalOpen(true) };

  return (
    <>
      <EuiButton
        fill
        iconType="plusInCircleFilled"
        key="createIndexButton"
        data-test-subj="createIndexButton"
        data-telemetry-id="idxMgmt-indexList-createIndexButton"
        {...actionProp}
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
