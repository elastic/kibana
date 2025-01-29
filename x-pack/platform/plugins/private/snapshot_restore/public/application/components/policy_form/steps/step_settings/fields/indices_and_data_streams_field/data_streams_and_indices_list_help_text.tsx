/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiLink } from '@elastic/eui';

interface Props {
  onSelectionChange: (selection: 'all' | 'none') => void;
  selectedIndicesAndDataStreams: string[];
  indices: string[];
  dataStreams: string[];
}

export const DataStreamsAndIndicesListHelpText: FunctionComponent<Props> = ({
  onSelectionChange,
  selectedIndicesAndDataStreams,
  indices,
  dataStreams,
}) => {
  if (selectedIndicesAndDataStreams.length === 0) {
    return (
      <FormattedMessage
        id="xpack.snapshotRestore.policyForm.stepSettings.noDataStreamsOrIndicesHelpText"
        defaultMessage="Nothing will be backed up. {selectAllLink}"
        values={{
          selectAllLink: (
            <EuiLink
              onClick={() => {
                onSelectionChange('all');
              }}
            >
              <FormattedMessage
                id="xpack.snapshotRestore.policyForm.stepSettings.selectAllIndicesLink"
                defaultMessage="Select all"
              />
            </EuiLink>
          ),
        }}
      />
    );
  }

  const indicesCount = selectedIndicesAndDataStreams.reduce(
    (acc, v) => (indices.includes(v) ? acc + 1 : acc),
    0
  );
  const dataStreamsCount = selectedIndicesAndDataStreams.reduce(
    (acc, v) => (dataStreams.includes(v) ? acc + 1 : acc),
    0
  );

  return (
    <FormattedMessage
      id="xpack.snapshotRestore.policyForm.stepSettings.selectDataStreamsIndicesHelpText"
      defaultMessage="{indicesCount} {indicesCount, plural, one {index} other {indices}} and {dataStreamsCount} {dataStreamsCount, plural, one {data stream} other {data streams}} will be backed up. {deselectAllLink}"
      values={{
        dataStreamsCount,
        indicesCount,
        deselectAllLink: (
          <EuiLink
            data-test-subj="deselectIndicesLink"
            onClick={() => {
              onSelectionChange('none');
            }}
          >
            <FormattedMessage
              id="xpack.snapshotRestore.policyForm.stepSettings.deselectAllIndicesLink"
              defaultMessage="Deselect all"
            />
          </EuiLink>
        ),
      }}
    />
  );
};
