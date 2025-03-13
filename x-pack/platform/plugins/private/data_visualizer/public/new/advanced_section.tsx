/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiAccordion, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { FC } from 'react';
import React from 'react';
import type {
  IndicesIndexSettings,
  MappingTypeMapping,
} from '@elastic/elasticsearch/lib/api/types';
import { Mappings } from './file_status/mappings';
import { Settings } from './file_status/settings';

interface Props {
  mappings: MappingTypeMapping | null;
  setMappings: (mappings: MappingTypeMapping) => void;
  settings: IndicesIndexSettings;
  setSettings: (settings: string) => void;
}

export const AdvancedSection: FC<Props> = ({ mappings, setMappings, setSettings, settings }) => {
  return (
    <EuiAccordion id={'advancedSection'} buttonContent="Advanced" paddingSize="m">
      <EuiFlexGroup>
        <EuiFlexItem>
          <Mappings mappings={mappings ?? {}} setMappings={setMappings} />
        </EuiFlexItem>
        <EuiFlexItem>
          <Settings settings={settings ?? {}} setSettings={setSettings} />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiAccordion>
  );
};
