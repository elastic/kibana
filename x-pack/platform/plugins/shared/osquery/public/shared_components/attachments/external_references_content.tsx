/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import type { IExternalReferenceMetaDataProps } from './lazy_external_reference_content';
import { PackQueriesAttachmentWrapper } from './pack_queries_attachment_wrapper';

const AttachmentContent = (props: IExternalReferenceMetaDataProps) => {
  const { externalReferenceMetadata } = props;

  return (
    <EuiFlexGroup data-test-subj="osquery-attachment-content">
      <EuiFlexItem>
        <PackQueriesAttachmentWrapper
          actionId={externalReferenceMetadata.actionId}
          queryId={externalReferenceMetadata.queryId}
          agentIds={externalReferenceMetadata.agentIds}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

// eslint-disable-next-line import/no-default-export
export { AttachmentContent as default };
