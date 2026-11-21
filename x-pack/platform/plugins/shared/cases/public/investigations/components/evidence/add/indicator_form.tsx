/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import {
  EuiButtonGroup,
  EuiCallOut,
  EuiFieldText,
  EuiFormRow,
  EuiSelect,
  EuiSpacer,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { INDICATOR_TYPE_LABELS } from '../../../../../common/investigations/types';
import type {
  ImportIndicatorsResponse,
  IndicatorType,
} from '../../../../../common/investigations/types';
import { INVESTIGATION_LIMITS } from '../../../../../common/investigations/constants';
import { useImportIndicators } from '../../../hooks';
import { ICONS } from '../../../icons';
import {
  INDICATOR_PLACEHOLDERS,
  MAX_INDICATOR_LENGTH,
  validateIndicatorValue,
} from '../indicator_validation';
import { SeenElsewhereList } from '../seen_elsewhere';
import { useSeenElsewhere } from '../use_evidence_queries';
import { AddFormLayout } from './add_form_layout';
import type { AddFormProps } from './add_form_layout';
import { SharedFields } from './common_fields';
import { ImportCsvFields, countCsvRows } from './import_csv_fields';
import type { CsvSource } from './import_csv_fields';
import { toEvidenceInput, useCreateEvidence } from './use_create_evidence';
import { useSharedFields } from './use_shared_fields';
import * as i18n from '../translations';

const FORM_ID = 'investigationEvidenceAddIndicator';
const LOOKUP_DEBOUNCE_MS = 300;

const TYPE_OPTIONS = (Object.keys(INDICATOR_TYPE_LABELS) as IndicatorType[]).map((type) => ({
  value: type,
  text: INDICATOR_TYPE_LABELS[type],
}));

type Mode = 'single' | 'import';

const EMPTY_CSV: CsvSource = { text: '', bytes: 0, rows: 0 };

export interface IndicatorFormProps extends AddFormProps {
  initialMode?: Mode;
}

export const IndicatorForm: React.FC<IndicatorFormProps> = ({
  recordId,
  onDone,
  onBack,
  initialMode = 'single',
}) => {
  const { euiTheme } = useEuiTheme();
  const shared = useSharedFields(recordId);
  const { create, isLoading: isSaving } = useCreateEvidence(recordId);
  const importIndicators = useImportIndicators(recordId);
  const [mode, setMode] = useState<Mode>(initialMode);
  const [indicatorType, setIndicatorType] = useState<IndicatorType>('ip');
  const [value, setValue] = useState('');
  const [showErrors, setShowErrors] = useState(false);
  const [lookupValue, setLookupValue] = useState('');
  const [csv, setCsv] = useState<CsvSource>(EMPTY_CSV);
  const [csvError, setCsvError] = useState<string | undefined>();
  const [result, setResult] = useState<ImportIndicatorsResponse | null>(null);

  const trimmedValue = value.trim();
  const valueError = validateIndicatorValue(indicatorType, value);
  const visibleValueError = showErrors || trimmedValue.length > 0 ? valueError : undefined;

  useEffect(() => {
    const timer = setTimeout(
      () => setLookupValue(valueError === undefined ? trimmedValue : ''),
      LOOKUP_DEBOUNCE_MS
    );
    return () => clearTimeout(timer);
  }, [trimmedValue, valueError]);
  const { data: lookup } = useSeenElsewhere(recordId, lookupValue ? [lookupValue] : []);
  const seen = lookupValue ? lookup?.values[lookupValue.toLowerCase()] : undefined;

  const submitSingle = async () => {
    setShowErrors(true);
    if (valueError !== undefined) {
      return;
    }
    try {
      await create({
        claim: shared.claim,
        inputs: [
          toEvidenceInput(trimmedValue, {
            type: 'indicator',
            why: shared.trimmedWhy,
            source: { label: i18n.SOURCE_INDICATOR, kind: 'manual' },
            indicator: { type: indicatorType, value: trimmedValue },
            snapshot: {
              kind: 'indicator',
              facts: [
                [i18n.INDICATOR_FACT_TYPE, INDICATOR_TYPE_LABELS[indicatorType]],
                [i18n.INDICATOR_FACT_VALUE, trimmedValue],
              ],
              intel: [],
              seen: [],
            },
          }),
        ],
      });
      onDone();
    } catch {
      // The mutation already showed the error.
    }
  };

  const readFile = async (file: File | undefined) => {
    setCsvError(undefined);
    if (!file) {
      return;
    }
    if (file.size > INVESTIGATION_LIMITS.maxImportBytes) {
      setCsvError(
        i18n.IMPORT_TOO_LARGE(Math.round(INVESTIGATION_LIMITS.maxImportBytes / (1024 * 1024)))
      );
      return;
    }
    const text = await file.text();
    setCsv({ text, fileName: file.name, bytes: file.size, rows: countCsvRows(text) });
  };

  const submitImport = async () => {
    if (csv.text.trim().length === 0) {
      setCsvError(i18n.IMPORT_EMPTY);
      return;
    }
    setCsvError(undefined);
    try {
      setResult(await importIndicators.mutateAsync({ csv: csv.text }));
    } catch {
      // The mutation already showed the error.
    }
  };

  const isImport = mode === 'import';
  const isLoading = isSaving || importIndicators.isLoading;

  return (
    <AddFormLayout
      formId={FORM_ID}
      onBack={onBack}
      onSubmit={() => {
        if (result) {
          onDone();
        } else if (isImport) {
          void submitImport();
        } else {
          void submitSingle();
        }
      }}
      isLoading={isLoading}
      submitLabel={result ? i18n.DONE : isImport ? i18n.IMPORT_SUBMIT : i18n.ADD_EVIDENCE}
    >
      {result ? null : (
        <>
          <EuiButtonGroup
            legend={i18n.INDICATOR_MODE_LEGEND}
            buttonSize="compressed"
            options={[
              {
                id: 'investigationEvidenceAddIndicatorMode-single',
                label: i18n.INDICATOR_MODE_SINGLE,
                'data-test-subj': 'investigationEvidenceAddIndicatorMode-single',
              },
              {
                id: 'investigationEvidenceAddIndicatorMode-import',
                label: i18n.INDICATOR_MODE_IMPORT,
                'data-test-subj': 'investigationEvidenceAddIndicatorMode-import',
              },
            ]}
            idSelected={`investigationEvidenceAddIndicatorMode-${mode}`}
            onChange={(id) => setMode(id.endsWith('import') ? 'import' : 'single')}
          />
          <EuiSpacer size="m" />
        </>
      )}
      {isImport ? (
        <ImportCsvFields
          source={csv}
          onTextChange={(text) => {
            setCsvError(undefined);
            setCsv({ text, bytes: text.length, rows: countCsvRows(text) });
          }}
          onFile={(file) => void readFile(file)}
          onClearFile={() => setCsv(EMPTY_CSV)}
          error={csvError}
          result={result}
        />
      ) : (
        <>
          <EuiFormRow label={i18n.INDICATOR_TYPE_LABEL} fullWidth>
            <EuiSelect
              fullWidth
              options={TYPE_OPTIONS}
              value={indicatorType}
              onChange={(event) => setIndicatorType(event.target.value as IndicatorType)}
              data-test-subj="investigationEvidenceAddIndicatorType"
            />
          </EuiFormRow>
          <EuiFormRow
            label={i18n.INDICATOR_VALUE_LABEL}
            isInvalid={Boolean(visibleValueError)}
            error={visibleValueError}
            fullWidth
          >
            <EuiFieldText
              fullWidth
              value={value}
              isInvalid={Boolean(visibleValueError)}
              placeholder={i18n.INDICATOR_EXAMPLE(INDICATOR_PLACEHOLDERS[indicatorType])}
              maxLength={MAX_INDICATOR_LENGTH + 1}
              onChange={(event) => setValue(event.target.value)}
              css={css`
                font-family: ${euiTheme.font.familyCode};
              `}
              data-test-subj="investigationEvidenceAddIndicatorValue"
            />
          </EuiFormRow>
          {seen && seen.count > 0 ? (
            <>
              <EuiCallOut
                announceOnMount
                size="s"
                color="warning"
                iconType={ICONS.related}
                title={i18n.SEEN_IN_OTHER(seen.count)}
                data-test-subj="investigationEvidenceAddSeenElsewhere"
              >
                <SeenElsewhereList info={seen} />
              </EuiCallOut>
              <EuiSpacer size="s" />
            </>
          ) : null}
          <SharedFields
            value={shared.why}
            onChange={shared.setWhy}
            claims={shared.claims}
            claimId={shared.claimId}
            onClaimChange={shared.setClaimId}
          />
        </>
      )}
    </AddFormLayout>
  );
};
IndicatorForm.displayName = 'IndicatorForm';
