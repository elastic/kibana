/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import { KiFormattedDate } from '../../shared/ki_formatted_date';
import type { KiGovernanceWriter } from './view_ki_document_helpers';
import { KI_FORMATTED_DATE_SENTENCE_START_CLASS_NAME } from '../view_ki_constants';
import { ViewKiSidebarWriterProvenance } from './view_ki_writer_provenance';

interface KiMetadataProvenanceRowProps {
  at?: string;
  writer?: KiGovernanceWriter;
}

export const KiMetadataProvenanceRow = ({ at, writer }: KiMetadataProvenanceRowProps) => {
  if (at && writer) {
    return (
      <span className="eui-textBreakWord">
        <FormattedMessage
          id="xpack.contextEngine.viewKi.metadata.provenanceAtBy"
          defaultMessage="{time} by {writer}"
          values={{
            time: (
              <KiFormattedDate value={at} className={KI_FORMATTED_DATE_SENTENCE_START_CLASS_NAME} />
            ),
            writer: <ViewKiSidebarWriterProvenance writer={writer} />,
          }}
        />
      </span>
    );
  }

  if (at) {
    return <KiFormattedDate value={at} className={KI_FORMATTED_DATE_SENTENCE_START_CLASS_NAME} />;
  }

  if (writer) {
    return (
      <span className="eui-textBreakWord">
        <FormattedMessage
          id="xpack.contextEngine.viewKi.metadata.provenanceByOnly"
          defaultMessage="by {writer}"
          values={{
            writer: <ViewKiSidebarWriterProvenance writer={writer} />,
          }}
        />
      </span>
    );
  }

  return null;
};
