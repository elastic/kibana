/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiInlineEditText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { IngestStreamGetResponse, StreamUpsertRequest } from '@kbn/streams-schema';
import { omit } from 'lodash';
import React, { ChangeEvent, useEffect, useState } from 'react';
import { useUpdateStreams } from '../../hooks/use_update_streams';

const EMPTY_DESCRIPTION_LABEL = i18n.translate(
  'xpack.streams.streamDescription.emptyDescriptionLabel',
  { defaultMessage: 'Add a description' }
);

interface Props {
  definition: IngestStreamGetResponse;
}

export function StreamDescription({ definition }: Props) {
  const updateStream = useUpdateStreams(definition.stream.name);

  useEffect(() => {
    setDescriptionValue(definition.stream.description);
  }, [definition.stream.description]);

  const [descriptionValue, setDescriptionValue] = useState(definition.stream.description);
  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    setDescriptionValue(e.target.value);
  };

  return (
    <EuiFlexGroup alignItems="center" gutterSize="xs">
      <EuiFlexItem grow>
        <EuiInlineEditText
          placeholder={EMPTY_DESCRIPTION_LABEL}
          value={descriptionValue}
          onChange={onChange}
          onCancel={(previousValue) => {
            setDescriptionValue(previousValue);
          }}
          inputAriaLabel={i18n.translate('xpack.streams.streamDescription.inputAriaLabel', {
            defaultMessage: 'Edit Stream description',
          })}
          size="s"
          onSave={async (value) => {
            const sanitized = value.trim();
            setDescriptionValue(sanitized);

            await updateStream({
              dashboards: definition.dashboards,
              stream: { ...omit(definition.stream, ['name']), description: sanitized },
            } as StreamUpsertRequest);
          }}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
