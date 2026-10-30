/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useRef, useState } from 'react';
import { EuiTextArea, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { useDefinitionFormContext } from '../form_context';
import { toFormValue, type FormValue } from '../values';

const stringify = (value: FormValue | undefined): string =>
  value === undefined ? '' : JSON.stringify(value, null, 2);

interface JsonValueControlProps {
  value: FormValue | undefined;
  onChange: (value: FormValue | undefined) => void;
  isInvalid: boolean;
  controlId: string;
  placeholder?: string;
  'data-test-subj'?: string;
}

/** Raw JSON editing for literal arrays/objects and for field types this form does not know. */
export function JsonValueControl({
  value,
  onChange,
  isInvalid,
  controlId,
  placeholder,
  'data-test-subj': dataTestSubj,
}: JsonValueControlProps) {
  const { euiTheme } = useEuiTheme();
  const monospace = css`
    font-family: ${euiTheme.font.familyCode};
  `;
  const { reportUnparsedInput } = useDefinitionFormContext();
  const [text, setText] = useState(() => stringify(value));
  const [parseError, setParseError] = useState(false);
  const lastEmitted = useRef(value);

  useEffect(() => {
    reportUnparsedInput(controlId, parseError);
  }, [controlId, parseError, reportUnparsedInput]);
  useEffect(() => () => reportUnparsedInput(controlId, false), [controlId, reportUnparsedInput]);

  useEffect(() => {
    if (value !== lastEmitted.current) {
      lastEmitted.current = value;
      setText(stringify(value));
      setParseError(false);
    }
  }, [value]);

  return (
    <EuiTextArea
      id={controlId}
      compressed
      fullWidth
      rows={3}
      css={monospace}
      value={text}
      placeholder={placeholder}
      isInvalid={isInvalid || parseError}
      data-test-subj={dataTestSubj}
      onChange={(event) => {
        const next = event.target.value;
        setText(next);
        if (next.trim() === '') {
          setParseError(false);
          lastEmitted.current = undefined;
          onChange(undefined);
          return;
        }
        try {
          const parsed = toFormValue(JSON.parse(next));
          setParseError(false);
          lastEmitted.current = parsed;
          onChange(parsed);
        } catch {
          setParseError(true);
        }
      }}
    />
  );
}
