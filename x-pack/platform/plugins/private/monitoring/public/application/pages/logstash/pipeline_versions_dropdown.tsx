/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiSelect } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

interface Props {
  pipelineVersions: any[];
  pipelineHash?: string;
  onChangePipelineHash: (hash: string) => void;
}

export const PipelineVersions = (props: Props) => {
  const { pipelineHash, pipelineVersions, onChangePipelineHash } = props;

  return (
    <EuiFlexGroup>
      <EuiFlexItem grow={false}>
        <EuiSelect
          value={pipelineHash}
          options={pipelineVersions.map(
            (option: { hash: string; relativeLastSeen: number; relativeFirstSeen: number }) => {
              return {
                text: i18n.translate(
                  'xpack.monitoring.logstashNavigation.pipelineVersionDescription',
                  {
                    defaultMessage:
                      'Version active {relativeLastSeen} and first seen {relativeFirstSeen}',
                    values: {
                      relativeLastSeen: option.relativeLastSeen,
                      relativeFirstSeen: option.relativeFirstSeen,
                    },
                  }
                ),
                value: option.hash,
              };
            }
          )}
          onChange={({ target }) => onChangePipelineHash(target.value)}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
