/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiInlineEditText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { convertGetResponseIntoUpsertRequest, type Streams } from '@kbn/streams-schema';
import type { ChangeEvent } from 'react';
import React, { useEffect, useState } from 'react';
import { css } from '@emotion/react';
import { useStreamDetail } from '../../hooks/use_stream_detail';
import { useUpdateStreams } from '../../hooks/use_update_streams';

const EMPTY_TITLE_LABEL = i18n.translate('xpack.streams.streamTitle.emptyTitleLabel', {
  defaultMessage: 'Add a title',
});

interface Props {
  definition: Streams.ingest.all.GetResponse;
}

export function StreamTitle({ definition }: Props) {
  const { refresh } = useStreamDetail();
  const updateStream = useUpdateStreams(definition.stream.name);
  const [title, setTitle] = useState(definition.stream.title ?? '');

  useEffect(() => {
    setTitle(definition.stream.title ?? '');
  }, [definition.stream.title]);

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
  };

  return (
    <EuiInlineEditText
      data-test-subj="streamTitleEdit"
      css={css`
        .euiButtonEmpty {
          block-size: auto;
          white-space: normal;
          overflow: visible;
          vertical-align: baseline;
          text-align: start;
          font-size: 1.5rem;
          font-weight: 700;
        }

        .eui-textTruncate {
          overflow: visible !important;
          text-overflow: clip !important;
          white-space: normal !important;
        }
      `}
      editModeProps={{
        inputProps: {},
        formRowProps: {},
        saveButtonProps: {
          color: 'primary',
        },
        cancelButtonProps: {
          display: 'empty',
        },
      }}
      isReadOnly={definition.privileges.manage !== true}
      placeholder={EMPTY_TITLE_LABEL}
      value={title}
      onChange={onChange}
      onCancel={(previousValue) => {
        setTitle(previousValue);
      }}
      inputAriaLabel={i18n.translate('xpack.streams.streamTitle.inputAriaLabel', {
        defaultMessage: 'Edit Stream title',
      })}
      size="m"
      onSave={async (value) => {
        const sanitized = value.trim();
        setTitle(sanitized);

        const request = convertGetResponseIntoUpsertRequest(definition);
        request.stream.title = sanitized || undefined;

        await updateStream(request);

        refresh();
      }}
    />
  );
}
