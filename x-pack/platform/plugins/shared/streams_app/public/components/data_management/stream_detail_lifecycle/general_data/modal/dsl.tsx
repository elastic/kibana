/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState, useEffect } from 'react';
import type { Streams, IngestStreamLifecycle } from '@kbn/streams-schema';
import { isDslLifecycle } from '@kbn/streams-schema';
import {
  EuiButton,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFieldText,
  EuiPopover,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useBoolean } from '@kbn/react-hooks';
import { parseDuration } from '../../helpers/helpers';

interface Props {
  definition: Streams.ingest.all.GetResponse;
  isDisabled: boolean;
  setLifecycle: (lifecycle: IngestStreamLifecycle) => void;
  setSaveButtonDisabled: (isDisabled: boolean) => void;
}

const isInvalidRetention = (value: string) => {
  const num = Number(value);
  return isNaN(num) || num < 1 || num % 1 > 0;
};

export const DEFAULT_RETENTION_VALUE = '90';
export const DEFAULT_RETENTION_UNIT = { name: 'Days', value: 'd' };

export function DslField({ definition, isDisabled, setLifecycle, setSaveButtonDisabled }: Props) {
  const timeUnits = [
    { name: 'Days', value: 'd' },
    { name: 'Hours', value: 'h' },
    { name: 'Minutes', value: 'm' },
    { name: 'Seconds', value: 's' },
  ];

  const existingRetention = isDslLifecycle(definition.effective_lifecycle)
    ? parseDuration(definition.effective_lifecycle.dsl.data_retention)
    : undefined;
  const [selectedUnit, setSelectedUnit] = useState(
    (existingRetention && timeUnits.find((unit) => unit.value === existingRetention.unit)) ||
      DEFAULT_RETENTION_UNIT
  );
  const [retentionValue, setRetentionValue] = useState(
    (existingRetention && existingRetention.value?.toString()) || DEFAULT_RETENTION_VALUE
  );
  const [showUnitMenu, { on: openUnitMenu, off: closeUnitMenu }] = useBoolean(false);
  const invalidRetention = useMemo(() => isInvalidRetention(retentionValue), [retentionValue]);

  useEffect(() => {
    if (!invalidRetention && retentionValue && selectedUnit.value) {
      setLifecycle({
        dsl: {
          data_retention: `${Number(retentionValue)}${selectedUnit.value}`,
        },
      });
      setSaveButtonDisabled(false);
    } else {
      setSaveButtonDisabled(true);
    }
  }, [retentionValue, selectedUnit.value]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <EuiFieldText
        data-test-subj="streamsAppDslModalDaysField"
        value={retentionValue}
        onChange={(e) => {
          setRetentionValue(e.target.value);
        }}
        disabled={isDisabled}
        fullWidth
        isInvalid={invalidRetention}
        append={
          <EuiPopover
            isOpen={showUnitMenu}
            panelPaddingSize="none"
            closePopover={closeUnitMenu}
            button={
              <EuiButton
                data-test-subj="streamsAppDslModalButton"
                disabled={isDisabled}
                iconType="arrowDown"
                iconSide="right"
                color="text"
                onClick={openUnitMenu}
              >
                {selectedUnit.name}
              </EuiButton>
            }
          >
            <EuiContextMenuPanel
              size="s"
              items={timeUnits.map((unit) => (
                <EuiContextMenuItem
                  key={unit.value}
                  icon={selectedUnit.value === unit.value ? 'check' : 'empty'}
                  onClick={() => {
                    closeUnitMenu();
                    setSelectedUnit(unit);
                  }}
                >
                  {unit.name}
                </EuiContextMenuItem>
              ))}
            />
          </EuiPopover>
        }
      />
      {invalidRetention && !isDisabled ? (
        <>
          <EuiSpacer size="xs" />
          <EuiText color="danger" size="xs">
            {i18n.translate('xpack.streams.streamDetailLifecycle.invalidRetentionValue', {
              defaultMessage: 'A positive integer is required',
            })}
          </EuiText>
        </>
      ) : null}
    </>
  );
}
