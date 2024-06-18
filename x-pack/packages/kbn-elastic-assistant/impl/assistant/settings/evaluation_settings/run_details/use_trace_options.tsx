/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useCallback, useState } from 'react';
import { UseAssistantContext } from '../../../../assistant_context';

interface Props {
  setTraceOptions: UseAssistantContext['setTraceOptions'];
  traceOptions: UseAssistantContext['traceOptions'];
}

export interface TraceOptionsSettings {
  showTraceOptions: boolean;
  setShowTraceOptions: (value: boolean) => void;
  traceOptions: UseAssistantContext['traceOptions'];
  onApmUrlChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onLangSmithProjectChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onLangSmithApiKeyChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const useTraceOptions = ({ setTraceOptions, traceOptions }: Props): TraceOptionsSettings => {
  /** Trace Options **/
  const [showTraceOptions, setShowTraceOptions] = useState(false);
  const onApmUrlChange = useCallback(
    (e) => {
      setTraceOptions({ ...traceOptions, apmUrl: e.target.value });
    },
    [setTraceOptions, traceOptions]
  );
  const onLangSmithProjectChange = useCallback(
    (e) => {
      setTraceOptions({ ...traceOptions, langSmithProject: e.target.value });
    },
    [setTraceOptions, traceOptions]
  );
  const onLangSmithApiKeyChange = useCallback(
    (e) => {
      setTraceOptions({ ...traceOptions, langSmithApiKey: e.target.value });
    },
    [setTraceOptions, traceOptions]
  );

  return {
    showTraceOptions,
    setShowTraceOptions,
    traceOptions,
    onApmUrlChange,
    onLangSmithProjectChange,
    onLangSmithApiKeyChange,
  };
};
