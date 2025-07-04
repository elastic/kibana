/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import type { EuiBasicTableColumn } from '@elastic/eui';
import type { FileJSON } from '@kbn/shared-ux-file-types';

import * as i18n from './translations';
import { parseMimeType } from './utils';
import { FileNameLink } from './file_name_link';
import { FileActionsPopoverButton } from './file_actions_popover_button';

export interface FilesTableColumnsProps {
  caseId: string;
  showPreview: (file: FileJSON) => void;
}

export const useFilesTableColumns = ({
  caseId,
  showPreview,
}: FilesTableColumnsProps): Array<EuiBasicTableColumn<FileJSON>> => {
  return [
    {
      name: i18n.NAME,
      field: 'name',
      'data-test-subj': 'cases-files-table-filename',
      render: (name: string, file: FileJSON) => (
        <FileNameLink file={file} showPreview={() => showPreview(file)} />
      ),
      width: '60%',
    },
    {
      name: i18n.TYPE,
      'data-test-subj': 'cases-files-table-filetype',
      render: (attachment: FileJSON) => {
        return <span>{parseMimeType(attachment.mimeType)}</span>;
      },
    },
    {
      name: i18n.DATE_ADDED,
      field: 'created',
      'data-test-subj': 'cases-files-table-date-added',
      dataType: 'date',
    },
    {
      name: i18n.ACTIONS,
      width: '120px',
      actions: [
        {
          name: i18n.ACTIONS,
          render: (theFile: FileJSON) => (
            <FileActionsPopoverButton caseId={caseId} theFile={theFile} />
          ),
        },
      ],
    },
  ];
};
