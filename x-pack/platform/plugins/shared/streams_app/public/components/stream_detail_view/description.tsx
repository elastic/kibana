/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiInlineEditText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Streams } from '@kbn/streams-schema';
import { omit } from 'lodash';
import React, { ChangeEvent, useEffect, useState } from 'react';
import { css } from '@emotion/react';
import { useStreamDetail } from '../../hooks/use_stream_detail';
import { useUpdateStreams } from '../../hooks/use_update_streams';

const EMPTY_DESCRIPTION_LABEL = i18n.translate(
  'xpack.streams.streamDescription.emptyDescriptionLabel',
  { defaultMessage: 'Add a description' }
);

interface Props {
  definition: Streams.ingest.all.GetResponse;
}

export function StreamDescription({ definition }: Props) {
  const { refresh } = useStreamDetail();
  const updateStream = useUpdateStreams(definition.stream.name);
  const [description, setDescription] = useState(definition.stream.description);

  useEffect(() => {
    setDescription(definition.stream.description);
  }, [definition.stream.description]);

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    setDescription(e.target.value);
  };

  return (
    <div>
      <EuiInlineEditText
        data-test-subj="streamDescriptionEdit"
        css={css`
          .euiButtonEmpty {
            block-size: auto;
            white-space: normal;
            overflow: visible;
            vertical-align: baseline;
            text-align: start;
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
        placeholder={EMPTY_DESCRIPTION_LABEL}
        value={description}
        onChange={onChange}
        onCancel={(previousValue) => {
          setDescription(previousValue);
        }}
        inputAriaLabel={i18n.translate('xpack.streams.streamDescription.inputAriaLabel', {
          defaultMessage: 'Edit Stream description',
        })}
        size="xs"
        onSave={async (value) => {
          const sanitized = value.trim();
          setDescription(sanitized);

          await updateStream({
            queries: definition.queries,
            dashboards: definition.dashboards,
            stream: { ...omit(definition.stream, ['name']), description: sanitized },
          } as Streams.all.UpsertRequest);

          refresh();
        }}
      />
    </div>
  );
}
