/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { isEqual } from 'lodash';
import { EuiText } from '@elastic/eui';
import type { MergeCasesPreviewResponse } from '../../../../common/types/api';
import type { CaseConnector } from '../../../../common/types/domain';
import { ConnectorTypes } from '../../../../common/types/domain';
import { getNoneConnector } from '../../../../common/utils/connectors';
import type { FieldStateKind } from './field_state';
import { FieldRow } from './field_row';
import { getCaseRef } from './case_hover_card';
import type { ValueCardOption } from './value_card';
import { ValueCardGroup } from './value_card_group';
import * as i18n from './translations';

const NO_CONNECTOR_ID = '__none__';

/** "Task · High": the connector settings worth recognising it by. */
const getConnectorSettings = ({ fields }: CaseConnector): string => {
  if (fields == null) {
    return '';
  }
  return Object.values(fields)
    .filter(
      (value): value is string | number => typeof value === 'string' || typeof value === 'number'
    )
    .join(' · ');
};

interface ConnectorRowProps {
  preview: MergeCasesPreviewResponse;
  choice: CaseConnector | undefined;
  onChoose: (connector: CaseConnector) => void;
  state: FieldStateKind;
  /** Why the AI chose the value, until the user changes it. */
  aiReason?: string;
  isDisabled: boolean;
}

/** One connector card per distinct connector and settings, plus "No connector". */
export const ConnectorRow: React.FC<ConnectorRowProps> = ({
  preview,
  choice,
  onChoose,
  state,
  aiReason,
  isDisabled,
}) => {
  const { connector } = preview.fields;
  const options = useMemo<ValueCardOption[]>(
    () => [
      ...connector.options.map(({ value, caseIds }, index) => {
        const settings = getConnectorSettings(value);
        return {
          id: String(index),
          label: value.name,
          help: settings.length > 0 ? settings : undefined,
          caseIds,
          searchText: value.name,
        };
      }),
      {
        id: NO_CONNECTOR_ID,
        label: i18n.NO_CONNECTOR,
        caseIds: [],
        searchText: i18n.NO_CONNECTOR,
      },
    ],
    [connector.options]
  );

  const selectedId = useMemo(() => {
    if (choice === undefined) {
      return undefined;
    }
    if (choice.type === ConnectorTypes.none) {
      return NO_CONNECTOR_ID;
    }
    const index = connector.options.findIndex(({ value }) => isEqual(value, choice));
    return index >= 0 ? String(index) : undefined;
  }, [choice, connector.options]);

  const casesWithConnector = new Set(connector.options.flatMap(({ caseIds }) => caseIds));
  const notSet = preview.cases.filter(({ id }) => !casesWithConnector.has(id));

  return (
    <FieldRow fieldKey="connector" label={i18n.CONNECTOR} state={state} aiReason={aiReason}>
      <ValueCardGroup
        fieldKey="connector"
        legend={i18n.CONNECTOR}
        options={options}
        selectedId={selectedId}
        onSelect={(id) =>
          onChoose(
            id === NO_CONNECTOR_ID ? getNoneConnector() : connector.options[Number(id)].value
          )
        }
        cases={preview.cases}
        isDisabled={isDisabled}
        footer={
          <EuiText size="xs" color="subdued">
            {notSet.length > 0 ? `${i18n.NOT_SET_ON(notSet.map(getCaseRef).join(', '))}. ` : null}
            {i18n.CONNECTOR_PUSH_NOTE}
          </EuiText>
        }
      />
    </FieldRow>
  );
};
ConnectorRow.displayName = 'ConnectorRow';
