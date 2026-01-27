/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState, useEffect } from 'react';
import type { IngestStreamLifecycleAll, IngestStreamLifecycleDSL } from '@kbn/streams-schema';
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
  initialValue: IngestStreamLifecycleAll;
  isDisabled: boolean;
  setLifecycle: (lifecycle: IngestStreamLifecycleDSL) => void;
  setSaveButtonDisabled: (isDisabled: boolean) => void;
}

const isInvalidRetention = (value: string) => {
  const num = Number(value);
  return isNaN(num) || num < 1 || num % 1 > 0;
};

export const DEFAULT_RETENTION_VALUE = '90';
export const DEFAULT_RETENTION_UNIT = { name: 'Days', value: 'd' };

export function DslField({ initialValue, isDisabled, setLifecycle, setSaveButtonDisabled }: Props) {
  const timeUnits = [
    { name: 'Days', value: 'd' },
    { name: 'Hours', value: 'h' },
    { name: 'Minutes', value: 'm' },
    { name: 'Seconds', value: 's' },
  ];

  const existingRetention = isDslLifecycle(initialValue)
    ? parseDuration(initialValue.dsl.data_retention)
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
    setSelectedUnit(
      (existingRetention && timeUnits.find((unit) => unit.value === existingRetention.unit)) ||
        DEFAULT_RETENTION_UNIT
    );
    setRetentionValue(
      (existingRetention && existingRetention.value?.toString()) || DEFAULT_RETENTION_VALUE
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialValue]);

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
        value={isDisabled && existingRetention ? existingRetention?.value : retentionValue}
        onChange={(e) => {
          // Ignore changes when disabled to prevent updating lifecycle state in read-only mode
          if (isDisabled) return;
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
                  data-test-subj={`streamsAppDslModalUnitOption-${unit.value}`}
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
