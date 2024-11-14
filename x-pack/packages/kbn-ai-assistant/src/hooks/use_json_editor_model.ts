/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useEffect, useMemo, useState } from 'react';
import { monaco } from '@kbn/monaco';
import { createInitializedObject } from '../utils/create_initialized_object';
import { safeJsonParse } from '../utils/safe_json_parse';
import { useFunctions } from './use_functions';

const { editor, languages, Uri } = monaco;

export const useJsonEditorModel = ({
  functionName,
  initialJson,
}: {
  functionName: string | undefined;
  initialJson?: string | undefined;
}) => {
  const functions = useFunctions();

  const functionDefinition = functions.find((func) => func.name === functionName);

  const [initialJsonValue, setInitialJsonValue] = useState<string | undefined>(initialJson);

  const SCHEMA_URI = `http://elastic.co/${functionName}.json`;

  const modelUri = useMemo(() => Uri.parse(SCHEMA_URI), [SCHEMA_URI]);

  useEffect(() => {
    setInitialJsonValue(initialJson);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [functionName]);

  return useMemo(() => {
    if (!functionDefinition || !modelUri) {
      return {};
    }

    const schema = { ...functionDefinition.parameters };

    const initialJsonString = initialJsonValue
      ? JSON.stringify(safeJsonParse(initialJsonValue), null, 4) // prettify the json
      : functionDefinition.parameters.properties
      ? JSON.stringify(createInitializedObject(functionDefinition.parameters), null, 4)
      : '';

    languages.json.jsonDefaults.setDiagnosticsOptions({
      validate: true,
      schemas: [
        {
          uri: SCHEMA_URI,
          fileMatch: [String(modelUri)],
          schema,
        },
      ],
    });

    let model = editor.getModel(modelUri);

    if (model === null) {
      model = editor.createModel(initialJsonString, 'json', modelUri);
    } else {
      model.setValue(initialJsonString);
    }

    return { model, initialJsonString };
  }, [SCHEMA_URI, functionDefinition, initialJsonValue, modelUri]);
};
