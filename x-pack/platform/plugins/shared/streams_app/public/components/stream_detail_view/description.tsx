/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiInlineEditText } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { Streams } from '@kbn/streams-schema';
import { omit } from 'lodash';
import React, { ChangeEvent, useEffect, useState } from 'react';
import { useUpdateStreams } from '../../hooks/use_update_streams';
import { useStreamDetail } from '../../hooks/use_stream_detail';

const EMPTY_DESCRIPTION_LABEL = i18n.translate(
  'xpack.streams.streamDescription.emptyDescriptionLabel',
  { defaultMessage: 'Add a description' }
);

interface Props {
  definition: Streams.all.GetResponse;
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
    <EuiFlexGroup>
      <EuiFlexItem grow>
        <EuiInlineEditText
          data-test-subj="streamDescriptionEdit"
          editModeProps={{
            inputProps: {
              fullWidth: true,
            },
            formRowProps: {
              fullWidth: true,
            },
            saveButtonProps: {
              color: 'primary',
            },
            cancelButtonProps: {
              display: 'empty',
            },
          }}
          css={css`
            // div {
            //   align-items: baseline;
            // }
          `}
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
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
