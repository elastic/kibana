/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';
import {
  EuiIcon,
  EuiSpacer,
  EuiText,
  EuiCallOut,
  EuiBadge,
  useEuiTheme,
  EuiToolTip,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { CLASH_ERROR_TYPE, CLASH_TYPE } from '@kbn/file-upload';
import type { FileClash } from '@kbn/file-upload/file_upload_manager';

interface Props {
  fileClash: FileClash;
}

export const FileClashResult: FC<Props> = ({ fileClash }) => {
  if (fileClash.clash === CLASH_ERROR_TYPE.ERROR) {
    return <EuiCallOut color="danger" iconType="warning" title={getClashText(fileClash)} />;
  }

  if (fileClash.clash === CLASH_ERROR_TYPE.WARNING) {
    return (
      <EuiCallOut color="warning" iconType="warning" title={getClashText(fileClash)}>
        {fileClash.newFields?.length || fileClash.missingFields?.length ? (
          <EuiSpacer size="s" />
        ) : null}

        {fileClash.newFields?.length ? (
          <>
            <EuiText size="xs">
              <FormattedMessage
                id="xpack.dataVisualizer.file.fileStatus.newFields"
                defaultMessage="File contains {count} new fields which are not present in the selected index."
                values={{ count: fileClash.newFields.length }}
              />
            </EuiText>
          </>
        ) : null}

        {fileClash.missingFields?.length ? (
          <>
            <EuiText size="xs">
              <FormattedMessage
                id="xpack.dataVisualizer.file.fileStatus.missingFields"
                defaultMessage="File is missing {count} fields which are present in the selected index"
                values={{ count: fileClash.missingFields.length }}
              />
            </EuiText>
          </>
        ) : null}
      </EuiCallOut>
    );
  }
};

function getClashText(fileClash: FileClash) {
  if (fileClash.clash === CLASH_ERROR_TYPE.ERROR) {
    if (fileClash.clashType === CLASH_TYPE.FORMAT) {
      return (
        <FormattedMessage
          id="xpack.dataVisualizer.file.fileStatus.fileFormatClash"
          defaultMessage="File format different from other files"
        />
      );
    }

    if (fileClash.clashType === CLASH_TYPE.MAPPING) {
      return (
        <FormattedMessage
          id="xpack.dataVisualizer.file.fileStatus.mappingClash"
          defaultMessage="Mappings incompatible with other files"
        />
      );
    }

    if (fileClash.clashType === CLASH_TYPE.EXISTING_INDEX_MAPPING) {
      return (
        <FormattedMessage
          id="xpack.dataVisualizer.file.fileStatus.existingIndexMappingClash"
          defaultMessage="Mappings incompatible with existing index"
        />
      );
    }

    if (fileClash.clashType === CLASH_TYPE.UNSUPPORTED) {
      return (
        <FormattedMessage
          id="xpack.dataVisualizer.file.fileStatus.fileFormatNotSupported"
          defaultMessage="File format not supported"
        />
      );
    }
  }

  if (fileClash.clash === CLASH_ERROR_TYPE.WARNING) {
    return (
      <FormattedMessage
        id="xpack.dataVisualizer.file.fileStatus.fileClashWarning"
        defaultMessage="Mappings may be incompatible with the existing index"
      />
    );
  }
}

export const FileClashIcon: FC<Props> = ({ fileClash }) => {
  const { euiTheme } = useEuiTheme();
  switch (fileClash.clash) {
    case CLASH_ERROR_TYPE.ERROR:
      return (
        <EuiToolTip content={getClashText(fileClash)}>
          <EuiBadge color={euiTheme.colors.backgroundBaseDanger}>
            <EuiIcon type="alert" color="danger" size="s" />
          </EuiBadge>
        </EuiToolTip>
      );
    case CLASH_ERROR_TYPE.WARNING:
      return (
        <EuiToolTip content={getClashText(fileClash)}>
          <EuiBadge color={euiTheme.colors.backgroundBaseWarning}>
            <EuiIcon type="warning" color="warning" size="s" />
          </EuiBadge>
        </EuiToolTip>
      );
    default:
      return null;
  }
};
